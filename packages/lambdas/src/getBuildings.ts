import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /buildings
 * Returns all buildings with details and amenities
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /buildings request:', event);

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.BUILDINGS_TABLE,
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
    console.error('Error fetching buildings:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: 'Failed to fetch buildings' }),
    };
  }
};
