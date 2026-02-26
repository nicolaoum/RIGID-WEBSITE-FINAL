import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    // Get user info from Cognito authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    const userEmail = claims.email;
    const userId = claims.sub;

    // Get ticket ID from path (parameter name is 'ticketId')
    const ticketId = event.pathParameters?.ticketId;
    
    if (!ticketId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Ticket ID is required' }),
      };
    }

    const ticketsTable = process.env.TICKETS_TABLE;

    if (!ticketsTable) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Tickets table not configured' }),
      };
    }

    // Query to find the ticket and get its createdAt (sort key)
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: ticketsTable,
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
        body: JSON.stringify({ message: 'Ticket not found' }),
      };
    }

    const ticket = queryResult.Items[0];

    // Check if user is the ticket creator or is staff/admin
    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map(g => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    const isStaff = groups.includes('admin') || groups.includes('staff');
    const isTicketOwner = ticket.residentEmail?.toLowerCase() === userEmail?.toLowerCase() || ticket.userId === userId;

    if (!isStaff && !isTicketOwner) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'You do not have permission to delete this ticket' }),
      };
    }

    // Delete the ticket using composite key (id + createdAt)
    await docClient.send(
      new DeleteCommand({
        TableName: ticketsTable,
        Key: {
          id: ticketId,
          createdAt: ticket.createdAt,
        },
      })
    );

    console.log('Ticket deleted:', ticketId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Ticket deleted successfully',
      }),
    };
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to delete ticket',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
