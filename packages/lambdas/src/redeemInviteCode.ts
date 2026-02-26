import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const cognitoClient = new CognitoIdentityProvider({});
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /invite-codes/redeem
 * Public endpoint (no auth required) — tenant enters invite code + their info
 * Creates their Cognito account + resident record, assigns to unit
 */
export const handler = async (event: any) => {
  console.log('Redeem Invite Code Request:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}');
    const { code, email, name, phoneNumber, password } = body;

    // Validate required fields
    if (!code || !email || !name || !password) {
      return response(400, { message: 'Code, email, name, and password are required' });
    }

    if (password.length < 8) {
      return response(400, { message: 'Password must be at least 8 characters' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response(400, { message: 'Invalid email address' });
    }

    const emailLower = email.toLowerCase().trim();
    const codeUpper = code.toUpperCase().trim();

    // Look up the invite code
    const codeResult = await docClient.send(
      new GetCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        Key: { code: codeUpper },
      })
    );

    if (!codeResult.Item) {
      return response(404, { message: 'Invalid invite code. Please check and try again.' });
    }

    const inviteCode = codeResult.Item;

    // Check code status
    if (inviteCode.status === 'used') {
      return response(410, { message: 'This invite code has already been used.' });
    }

    if (inviteCode.status === 'expired') {
      return response(410, { message: 'This invite code has expired. Please ask your landlord for a new one.' });
    }

    // Check expiry
    if (new Date(inviteCode.expiresAt) < new Date()) {
      // Mark as expired
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.INVITE_CODES_TABLE,
          Key: { code: codeUpper },
          UpdateExpression: 'SET #status = :expired, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':expired': 'expired',
            ':now': new Date().toISOString(),
          },
        })
      );
      return response(410, { message: 'This invite code has expired. Please ask your landlord for a new one.' });
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      return response(500, { message: 'Server configuration error' });
    }

    // Format phone number
    let formattedPhone = phoneNumber?.trim() || '';
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      formattedPhone = `+357${formattedPhone.replace(/^0+/, '')}`;
    }

    // STEP 1: Create Cognito user
    let cognitoUsername: string;
    try {
      // Check if user already exists
      const existingUsers = await cognitoClient.listUsers({
        UserPoolId: userPoolId,
        Filter: `email = "${emailLower}"`,
        Limit: 1,
      });

      if (existingUsers.Users && existingUsers.Users.length > 0) {
        // User exists — just add them to resident group
        cognitoUsername = existingUsers.Users[0].Username!;
        console.log(`User ${emailLower} already exists as ${cognitoUsername}, adding to resident group`);
      } else {
        // Create new user via admin create
        const createResult = await cognitoClient.adminCreateUser({
          UserPoolId: userPoolId,
          Username: emailLower,
          TemporaryPassword: password,
          UserAttributes: [
            { Name: 'email', Value: emailLower },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: name },
            ...(formattedPhone ? [{ Name: 'phone_number', Value: formattedPhone }] : []),
          ],
          MessageAction: 'SUPPRESS', // Don't send welcome email — they already have the code
        });
        cognitoUsername = createResult.User?.Username || emailLower;

        // Set permanent password (skip the temp password flow)
        await cognitoClient.adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: cognitoUsername,
          Password: password,
          Permanent: true,
        });

        console.log(`Created Cognito user ${cognitoUsername}`);
      }

      // Add to resident group
      await cognitoClient.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: cognitoUsername,
        GroupName: 'resident',
      });

      console.log(`User ${cognitoUsername} added to resident group`);
    } catch (error: any) {
      console.error('Cognito error:', error);
      if (error.name === 'UsernameExistsException') {
        return response(409, { message: 'An account with this email already exists. Please use a different email or log in.' });
      }
      if (error.name === 'InvalidPasswordException') {
        return response(400, { message: 'Password does not meet requirements. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.' });
      }
      throw error;
    }

    // STEP 2: Check if resident record already exists
    const existingResident = await docClient.send(
      new QueryCommand({
        TableName: process.env.RESIDENTS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': emailLower },
        Limit: 1,
      })
    );

    let residentId: string;
    if (existingResident.Items && existingResident.Items.length > 0) {
      // Update existing resident record
      residentId = existingResident.Items[0].id;
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.RESIDENTS_TABLE,
          Key: { id: residentId },
          UpdateExpression: 'SET #status = :active, unitNumber = :unit, buildingId = :bldg, buildingName = :bldgName, #n = :name, phoneNumber = :phone, cognitoUsername = :cogUser, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status', '#n': 'name' },
          ExpressionAttributeValues: {
            ':active': 'active',
            ':unit': inviteCode.unitNumber,
            ':bldg': inviteCode.buildingId || 'unassigned',
            ':bldgName': inviteCode.buildingName || null,
            ':name': name,
            ':phone': formattedPhone || null,
            ':cogUser': cognitoUsername,
            ':now': new Date().toISOString(),
          },
        })
      );
    } else {
      // Create new resident record
      residentId = randomUUID();
      await docClient.send(
        new PutCommand({
          TableName: process.env.RESIDENTS_TABLE,
          Item: {
            id: residentId,
            email: emailLower,
            name,
            phoneNumber: formattedPhone || null,
            unitNumber: inviteCode.unitNumber,
            buildingId: inviteCode.buildingId || 'unassigned',
            buildingName: inviteCode.buildingName || null,
            status: 'active',
            cognitoUsername,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    }

    // STEP 3: Mark invite code as used
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        Key: { code: codeUpper },
        UpdateExpression: 'SET #status = :used, usedBy = :email, usedAt = :now, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':used': 'used',
          ':email': emailLower,
          ':now': new Date().toISOString(),
        },
      })
    );

    return response(201, {
      message: 'Registration successful! You can now log in to the resident portal.',
      email: emailLower,
      unitNumber: inviteCode.unitNumber,
      buildingName: inviteCode.buildingName,
    });
  } catch (error) {
    console.error('Error redeeming invite code:', error);
    return response(500, {
      message: 'Failed to complete registration. Please try again or contact management.',
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
