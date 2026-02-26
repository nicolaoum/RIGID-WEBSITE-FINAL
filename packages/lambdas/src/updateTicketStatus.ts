import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * PUT /tickets/{ticketId}/status
 * Updates the status of a ticket (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    // Extract user from Cognito authorizer context
    const claims = event.requestContext.authorizer?.claims;
    
    // Cognito sends groups as a comma-separated string
    let groups: string[] = [];
    const groupsClaim = claims?.['cognito:groups'];
    
    if (groupsClaim) {
      // If it's already an array, use it directly
      if (Array.isArray(groupsClaim)) {
        groups = groupsClaim;
      } 
      // If it's a string (which it is from Cognito), split by comma
      else if (typeof groupsClaim === 'string') {
        groups = groupsClaim.split(',').map(g => g.trim());
      }
    }
    
    const isStaff = groups.some(g => g === 'staff' || g === 'admin');

    if (!isStaff) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Only staff and admin can update ticket status',
        }),
      };
    }

    const ticketId = event.pathParameters?.ticketId;
    
    if (!ticketId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing ticket ID',
        }),
      };
    }
    
    const body = JSON.parse(event.body || '{}');
    const { status } = body;

    // Validate status
    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        }),
      };
    }

    // Query the ticket to get both id and createdAt (composite key)
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.TICKETS_TABLE,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': ticketId,
        },
        Limit: 1,
      })
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Ticket not found',
        }),
      };
    }

    const ticket = queryResult.Items[0];
    const createdAt = ticket.createdAt;

    // Update ticket status using composite key (id + createdAt)
    const now = new Date().toISOString();
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TICKETS_TABLE,
        Key: { 
          id: ticketId,
          createdAt: createdAt,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': now,
        },
      })
    );

    console.log(`Ticket ${ticketId} status updated to ${status}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Ticket status updated successfully',
      }),
    };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to update ticket status',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
