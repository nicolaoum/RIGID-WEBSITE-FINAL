import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * DELETE /units/{id}
 * Deletes a unit (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('DELETE /units/{id} request:', event);

  try {
    const { id } = event.pathParameters || {};
    
    if (!id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ error: 'Unit ID is required' }),
      };
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.UNITS_TABLE,
        Key: { id },
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error deleting unit:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: 'Failed to delete unit' }),
    };
  }
};
