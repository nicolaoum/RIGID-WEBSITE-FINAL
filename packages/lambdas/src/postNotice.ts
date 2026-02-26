import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from './shared/cors';
import { sanitizeText, sanitizeEnum } from './shared/sanitize';

const dynamoClient = new DynamoDB({});

/**
 * POST /notices
 * Create a new notice (staff/admin only).
 * Now protected by Cognito authorizer at API Gateway level AND Lambda-level role check.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    // Verify authentication (belt-and-suspenders with API Gateway authorizer)
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    // Verify staff/admin role
    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map((g: string) => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    if (!groups.includes('admin') && !groups.includes('staff')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Access denied. Staff or admin role required.' }),
      };
    }

    const body = JSON.parse(event.body || '{}');

    // Sanitize inputs
    const title = sanitizeText(body.title, 500);
    const content = sanitizeText(body.content, 10000);
    const type = sanitizeEnum(body.type, ['info', 'warning', 'urgent']);
    const buildingId = body.buildingId ? sanitizeText(body.buildingId, 100) : undefined;

    if (!title || !content || !type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing or invalid required fields: title, content, type' }),
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
      headers,
      body: JSON.stringify({
        message: 'Notice created',
        notice: { id: noticeId, title, content, type, publishedAt: now, buildingId },
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Error creating notice' }),
    };
  }
};
