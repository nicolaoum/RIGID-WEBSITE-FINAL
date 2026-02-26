import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /units
 * Creates a new unit (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

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
      headers,
      body: JSON.stringify(unit),
    };
  } catch (error) {
    console.error('Error creating unit:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create unit' }),
    };
  }
};
