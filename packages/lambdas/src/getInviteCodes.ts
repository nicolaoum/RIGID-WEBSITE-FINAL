import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * GET /invite-codes?unitId=xxx
 * Returns invite codes for a specific unit (staff/admin only)
 * Or all invite codes if no unitId specified
 */
export const handler = async (event: any) => {
  console.log('Get Invite Codes Request:', JSON.stringify(event, null, 2));

  try {
    // Check authorization
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return response(401, { message: 'Unauthorized' });
    }

    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map((g: string) => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    if (!groups.includes('admin') && !groups.includes('staff')) {
      return response(403, { message: 'Access denied. Staff/admin role required.' });
    }

    const unitId = event.queryStringParameters?.unitId;

    if (unitId) {
      // Get codes for specific unit
      const result = await docClient.send(
        new QueryCommand({
          TableName: process.env.INVITE_CODES_TABLE,
          IndexName: 'unitId-index',
          KeyConditionExpression: 'unitId = :unitId',
          ExpressionAttributeValues: { ':unitId': unitId },
          ScanIndexForward: false,
        })
      );

      return response(200, { codes: result.Items || [] });
    } else {
      // Scan all codes (for admin overview)
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
      const result = await docClient.send(
        new ScanCommand({
          TableName: process.env.INVITE_CODES_TABLE,
        })
      );

      return response(200, { codes: result.Items || [] });
    }
  } catch (error) {
    console.error('Error getting invite codes:', error);
    return response(500, {
      message: 'Failed to get invite codes',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

function response(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
