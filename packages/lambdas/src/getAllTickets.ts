import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /tickets/all
 * Returns ALL tickets across all users (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
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
        headers,
        body: JSON.stringify({ error: 'Forbidden - Staff access required' }),
      };
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.TICKETS_TABLE,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify([]),
    };
  }
};
