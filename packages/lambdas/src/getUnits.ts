import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /units
 * Returns all available units with building information
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.UNITS_TABLE,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error fetching units:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch units' }),
    };
  }
};
