import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * GET /inquiries
 * Returns all inquiries (staff/admin only - protected by Cognito authorizer)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /inquiries request:', event);

  try {
    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';

    const result = await dynamoClient.scan({
      TableName: inquiriesTable,
    });

    const inquiries = (result.Items || []).map(item => ({
      id: item.id?.S,
      name: item.name?.S,
      email: item.email?.S,
      phone: item.phone?.S || null,
      subject: item.subject?.S || null,
      message: item.message?.S,
      status: item.status?.S || 'new',
      createdAt: item.createdAt?.S,
    })).sort((a, b) => {
      // Sort newest first
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(inquiries),
    };
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify([]),
    };
  }
};
