import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log('Add Resident Request:', JSON.stringify(event, null, 2));

  try {
    // Get user info from Cognito authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }

    // Check if user is admin or staff
    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map(g => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    const isAdmin = groups.includes('admin');
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Access denied. Admin role required.' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, name, unitNumber, buildingId, phoneNumber } = body;

    // Validate required fields
    if (!email || !name) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Email and name are required' }),
      };
    }

    // Create resident record
    const resident = {
      id: uuidv4(),
      email: email.toLowerCase(),
      name,
      unitNumber: unitNumber || null,
      buildingId: buildingId || null,
      phoneNumber: phoneNumber || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: process.env.RESIDENTS_TABLE,
        Item: resident,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify(resident),
    };
  } catch (error) {
    console.error('Error adding resident:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to add resident',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
