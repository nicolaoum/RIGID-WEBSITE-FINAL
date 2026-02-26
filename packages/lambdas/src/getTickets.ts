import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /tickets
 * Returns all tickets for the authenticated resident
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /tickets request:', event);

  try {
    // Extract user email from Cognito authorizer context
    const userEmail = event.requestContext.authorizer?.claims?.email || 'unknown@example.com';
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';

    // Query tickets by userId (using GSI)
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.TICKETS_TABLE,
        IndexName: 'userId-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: false, // newest first
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
    console.error('Error fetching tickets:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify([]),
    };
  }
};
