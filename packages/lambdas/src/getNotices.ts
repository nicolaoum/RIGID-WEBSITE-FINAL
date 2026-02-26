import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from './shared/cors';

const dynamoClient = new DynamoDB({});

/**
 * GET /notices
 * Returns all active notices for residents (requires authentication)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const noticesTable = process.env.NOTICES_TABLE || process.env.NOTICES_TABLE_NAME || 'rigid-notices';

    const result = await dynamoClient.scan({
      TableName: noticesTable,
    });

    const notices = (result.Items || []).map(item => ({
      id: item.id?.S,
      title: item.title?.S,
      content: item.content?.S,
      type: item.type?.S,
      publishedAt: item.publishedAt?.S,
      buildingId: item.buildingId?.S || null,
    })).sort((a, b) => {
      return new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime();
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(notices),
    };
  } catch (error) {
    console.error('Error fetching notices:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify([]),
    };
  }
};
