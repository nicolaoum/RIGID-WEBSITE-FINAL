import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from './shared/cors';

const dynamoClient = new DynamoDB({});

/**
 * PUT /inquiries/{id}
 * Updates the status of an inquiry (staff only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const id = event.pathParameters?.id;
    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Missing inquiry id' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { status } = body;

    if (!status || !['new', 'pending', 'done'].includes(status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Invalid status. Must be: new, pending, or done' }),
      };
    }

    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';

    await dynamoClient.updateItem({
      TableName: inquiriesTable,
      Key: { id: { S: id } },
      UpdateExpression: 'SET #s = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':status': { S: status },
        ':updatedAt': { S: new Date().toISOString() },
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: `Inquiry marked as ${status}` }),
    };
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
