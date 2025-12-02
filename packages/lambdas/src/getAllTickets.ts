import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /tickets/all
 * Returns ALL tickets across all users (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /tickets/all request:', JSON.stringify(event, null, 2));

  try {
    // Verify user is staff or admin - handle comma-separated string from Cognito
    const groupsClaim = event.requestContext.authorizer?.claims['cognito:groups'];
    let groups: string[] = [];
    
    if (groupsClaim) {
      if (Array.isArray(groupsClaim)) {
        groups = groupsClaim;
      } else if (typeof groupsClaim === 'string') {
        groups = groupsClaim.split(',').map(g => g.trim());
      }
    }
    
    const isStaff = groups.some(g => g === 'staff' || g === 'admin');

    if (!isStaff) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ error: 'Forbidden - Staff access required' }),
      };
    }

    // Scan all tickets (for staff portal)
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.TICKETS_TABLE,
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify([]),
    };
  }
};
