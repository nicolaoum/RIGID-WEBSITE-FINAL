import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /units
 * Creates a new unit (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('POST /units request:', event);

  try {
    const body = JSON.parse(event.body || '{}');
    
    const unit = {
      id: `unit-${randomUUID()}`,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.UNITS_TABLE,
        Item: unit,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(unit),
    };
  } catch (error) {
    console.error('Error creating unit:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: 'Failed to create unit' }),
    };
  }
};
