import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

/**
 * GET /notices
 * Returns all active notices for residents (requires authentication)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /notices request:', event);

  try {
    const noticesTable = process.env.NOTICES_TABLE || process.env.NOTICES_TABLE_NAME || 'rigid-notices';

    // Scan all notices from DynamoDB
    const result = await dynamoClient.scan({
      TableName: noticesTable,
    });

    // Convert DynamoDB items to notice objects
    const notices = (result.Items || []).map(item => ({
      id: item.id?.S,
      title: item.title?.S,
      content: item.content?.S,
      type: item.type?.S,
      publishedAt: item.publishedAt?.S,
      buildingId: item.buildingId?.S || null,
    })).sort((a, b) => {
      // Sort by publishedAt in descending order (newest first)
      return new Date(b.publishedAt || '').getTime() - new Date(a.publishedAt || '').getTime();
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(notices),
    };
  } catch (error) {
    console.error('Error fetching notices:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify([]),
    };
  }
};
