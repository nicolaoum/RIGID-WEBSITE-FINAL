import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /residents/register
 * Self-registration endpoint for residents
 * Anyone authenticated can register themselves with email and unit info
 * Status will be 'pending' until admin authorizes them
 */
export const handler = async (event: any) => {
  console.log('Resident Self-Registration Request:', JSON.stringify(event, null, 2));

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
        body: JSON.stringify({ message: 'Unauthorized - authentication required' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, unitNumber, buildingId, phoneNumber } = body;

    // Validate required fields
    if (!email || !unitNumber) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Email and unit number are required' }),
      };
    }

    const emailLower = email.toLowerCase();

    // Check if resident already exists
    const existingResult = await docClient.send(
      new QueryCommand({
        TableName: process.env.RESIDENTS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': emailLower,
        },
        Limit: 1,
      })
    );

    if (existingResult.Items && existingResult.Items.length > 0) {
      return {
        statusCode: 409,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'This email is already registered' }),
      };
    }

    // Create pending resident record
    const resident: Record<string, any> = {
      id: randomUUID(),
      email: emailLower,
      unitNumber,
      buildingId: buildingId || null,
      phoneNumber: phoneNumber || null,
      status: 'pending', // Pending until admin approves
      requestedAt: new Date().toISOString(),
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
      body: JSON.stringify({
        message: 'Registration request submitted successfully',
        resident: {
          id: resident.id,
          email: resident.email,
          unitNumber: resident.unitNumber,
          status: resident.status,
        },
      }),
    };
  } catch (error) {
    console.error('Error in resident self-registration:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to submit registration request',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
