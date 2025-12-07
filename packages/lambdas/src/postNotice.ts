import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

/**
 * POST /notices
 * Create a new notice (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, content, type, buildingId } = body;

    if (!title || !content || !type) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    if (!['info', 'warning', 'urgent'].includes(type)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Invalid type' }),
      };
    }

    const noticesTable = process.env.NOTICES_TABLE || process.env.NOTICES_TABLE_NAME || 'rigid-notices';
    const now = new Date().toISOString();
    const noticeId = `notice-${Date.now()}`;

    const noticeItem: any = {
      id: { S: noticeId },
      createdAt: { S: now },
      title: { S: title },
      content: { S: content },
      type: { S: type },
      publishedAt: { S: now },
    };

    if (buildingId) {
      noticeItem.buildingId = { S: buildingId };
    }

    await dynamoClient.putItem({
      TableName: noticesTable,
      Item: noticeItem,
    });

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'Notice created',
        notice: { id: noticeId, title, content, type, publishedAt: now, buildingId },
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Error creating notice' }),
    };
  }
};
