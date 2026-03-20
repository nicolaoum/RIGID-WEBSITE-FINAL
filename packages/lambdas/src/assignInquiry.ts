import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * PUT /inquiries/{id}/assign
 * Assigns an inquiry to a staff member (admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('PUT /inquiries/{id}/assign request:', event);

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
    const { assignedTo } = body;

    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';

    await dynamoClient.updateItem({
      TableName: inquiriesTable,
      Key: { id: { S: id } },
      UpdateExpression: 'SET assignedTo = :assignedTo, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':assignedTo': { S: assignedTo || '' },
        ':updatedAt': { S: new Date().toISOString() },
      },
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Inquiry assigned successfully' }),
    };
  } catch (error) {
    console.error('Error assigning inquiry:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
    };
  }
};
