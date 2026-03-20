import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * PUT /inquiries/{id}/notes
 * Adds internal notes to an inquiry (staff only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('PUT /inquiries/{id}/notes request:', event);

  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Missing inquiry id' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { notes } = body;

    if (!notes) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Notes are required' }),
      };
    }

    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';

    await dynamoClient.updateItem({
      TableName: inquiriesTable,
      Key: { id: { S: id } },
      UpdateExpression: 'SET notes = :notes, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':notes': { S: notes },
        ':updatedAt': { S: new Date().toISOString() },
      },
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Notes updated successfully' }),
    };
  } catch (error) {
    console.error('Error updating inquiry notes:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
