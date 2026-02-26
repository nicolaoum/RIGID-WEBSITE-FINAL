import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /invite-codes
 * Generates a unique invite code for a specific unit
 * Staff/admin only
 */
export const handler = async (event: any) => {
  console.log('Generate Invite Code Request:', JSON.stringify(event, null, 2));

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

    // Parse request
    const body = JSON.parse(event.body || '{}');
    const { unitId } = body;

    if (!unitId) {
      return response(400, { message: 'unitId is required' });
    }

    // Look up the unit to get building info
    const unitResult = await docClient.send(
      new GetCommand({
        TableName: process.env.UNITS_TABLE,
        Key: { id: unitId },
      })
    );

    if (!unitResult.Item) {
      return response(404, { message: 'Unit not found' });
    }

    const unit = unitResult.Item;

    // Invalidate any existing unused codes for this unit
    const existingCodes = await docClient.send(
      new QueryCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        IndexName: 'unitId-index',
        KeyConditionExpression: 'unitId = :unitId',
        FilterExpression: '#status = :unused',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':unitId': unitId,
          ':unused': 'unused',
        },
      })
    );

    // Mark old codes as expired
    if (existingCodes.Items && existingCodes.Items.length > 0) {
      const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
      for (const oldCode of existingCodes.Items) {
        await docClient.send(
          new UpdateCommand({
            TableName: process.env.INVITE_CODES_TABLE,
            Key: { code: oldCode.code },
            UpdateExpression: 'SET #status = :expired, updatedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':expired': 'expired',
              ':now': new Date().toISOString(),
            },
          })
        );
      }
    }

    // Generate a unique, human-readable code
    // Format: BLDG-UNIT-XXXX (e.g., PIER-101-7X3K)
    const buildingPrefix = (unit.buildingName || 'UNIT')
      .replace(/^RIGID\s*\d*\s*/i, '')
      .substring(0, 4)
      .toUpperCase()
      .replace(/\s/g, '');
    const unitNum = (unit.unitNumber || '000').substring(0, 4);
    const randomPart = randomBytes(2).toString('hex').toUpperCase().substring(0, 4);
    const code = `${buildingPrefix || 'UNIT'}-${unitNum}-${randomPart}`;

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const inviteCode = {
      code,
      unitId,
      unitNumber: unit.unitNumber,
      buildingId: unit.buildingId || null,
      buildingName: unit.buildingName || null,
      status: 'unused', // unused | used | expired
      createdBy: claims.email || claims.sub,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        Item: inviteCode,
      })
    );

    return response(201, {
      message: 'Invite code generated successfully',
      code,
      unitNumber: unit.unitNumber,
      buildingName: unit.buildingName,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating invite code:', error);
    return response(500, {
      message: 'Failed to generate invite code',
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
