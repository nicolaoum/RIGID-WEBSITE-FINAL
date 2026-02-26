import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * PATCH /units/{id}
 * Updates a unit's fields (staff/admin only)
 * Supports toggling `available` and updating other editable fields.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('PATCH /units/{id} request:', event);

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

    const body = JSON.parse(event.body || '{}');

    // Only allow updating specific fields
    const ALLOWED_FIELDS = ['available', 'rent', 'price', 'availableDate', 'videoUrl'];
    const updates: Record<string, any> = {};

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    // Always set updatedAt
    updates.updatedAt = new Date().toISOString();

    // Build the UpdateExpression dynamically
    const expressionParts: string[] = [];
    const expressionNames: Record<string, string> = {};
    const expressionValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      expressionParts.push(`#${key} = :${key}`);
      expressionNames[`#${key}`] = key;
      expressionValues[`:${key}`] = value;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.UNITS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error('Error updating unit:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: 'Failed to update unit' }),
    };
  }
};
