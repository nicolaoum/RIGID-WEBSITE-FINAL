import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /tickets
 * Returns all tickets for the authenticated resident
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.TICKETS_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Items || []),
    };
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify([]),
    };
  }
};
