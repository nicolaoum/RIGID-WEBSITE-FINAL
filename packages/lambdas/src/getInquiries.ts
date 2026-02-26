import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from './shared/cors';

const dynamoClient = new DynamoDB({});

/**
 * GET /inquiries
 * Returns all inquiries (staff/admin only - protected by Cognito authorizer)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

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
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(inquiries),
    };
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify([]),
    };
  }
};
