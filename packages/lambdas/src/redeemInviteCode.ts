import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { randomUUID } from 'crypto';

const cognitoClient = new CognitoIdentityProvider({});
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const sesClient = new SESClient({});

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
    let isExistingUser = false;
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
        isExistingUser = true;
        console.log(`User ${emailLower} already exists as ${cognitoUsername}, adding to resident group`);
      } else {
        // Create new user — email NOT verified yet
        const createResult = await cognitoClient.adminCreateUser({
          UserPoolId: userPoolId,
          Username: emailLower,
          TemporaryPassword: password,
          UserAttributes: [
            { Name: 'email', Value: emailLower },
            { Name: 'email_verified', Value: 'false' },
            { Name: 'name', Value: name },
            ...(formattedPhone ? [{ Name: 'phone_number', Value: formattedPhone }] : []),
          ],
          MessageAction: 'SUPPRESS',
        });
        cognitoUsername = createResult.User?.Username || emailLower;

        // Set permanent password (skip the temp password flow)
        await cognitoClient.adminSetUserPassword({
          UserPoolId: userPoolId,
          Username: cognitoUsername,
          Password: password,
          Permanent: true,
        });

        console.log(`Created Cognito user ${cognitoUsername} (email unverified)`);
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

    // STEP 2: Evict any previous residents from this unit (auto-replace)
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const unitOccupants = await docClient.send(
      new ScanCommand({
        TableName: process.env.RESIDENTS_TABLE,
        FilterExpression: 'buildingId = :bldg AND unitNumber = :unit AND #status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':bldg': inviteCode.buildingId || 'unassigned',
          ':unit': inviteCode.unitNumber,
          ':active': 'active',
        },
      })
    );

    if (unitOccupants.Items && unitOccupants.Items.length > 0) {
      for (const oldResident of unitOccupants.Items) {
        // Skip if it's the same person re-registering
        if (oldResident.email === emailLower) continue;

        console.log(`Evicting previous resident ${oldResident.email} from unit ${inviteCode.unitNumber} in ${inviteCode.buildingName}`);

        // Deactivate the old resident record
        await docClient.send(
          new UpdateCommand({
            TableName: process.env.RESIDENTS_TABLE,
            Key: { id: oldResident.id },
            UpdateExpression: 'SET #status = :inactive, updatedAt = :now, evictedAt = :now, evictedBy = :reason',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':inactive': 'inactive',
              ':now': new Date().toISOString(),
              ':reason': `replaced by ${emailLower} via invite code`,
            },
          })
        );

        // Remove old resident from Cognito (delete their account)
        if (oldResident.cognitoUsername) {
          try {
            await cognitoClient.adminRemoveUserFromGroup({
              UserPoolId: userPoolId,
              Username: oldResident.cognitoUsername,
              GroupName: 'resident',
            });
            await cognitoClient.adminDeleteUser({
              UserPoolId: userPoolId,
              Username: oldResident.cognitoUsername,
            });
            console.log(`Deleted Cognito user ${oldResident.cognitoUsername} (${oldResident.email})`);
          } catch (cognitoErr: any) {
            // Don't fail the whole registration if cleanup fails
            console.error(`Failed to delete old Cognito user ${oldResident.cognitoUsername}:`, cognitoErr.message);
          }
        }
      }
    }

    // STEP 3: Check if resident record already exists for this email
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

    // STEP 4: Mark invite code as used
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

    // STEP 5: Send email verification code (skip for existing users who are already verified)
    let requiresVerification = false;
    if (!isExistingUser) {
      // Generate a 6-digit verification code
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

      // Store the verification record (keyed as VERIFY-email)
      await docClient.send(
        new PutCommand({
          TableName: process.env.INVITE_CODES_TABLE,
          Item: {
            code: `VERIFY-${emailLower}`,
            verificationCode,
            cognitoUsername,
            email: emailLower,
            status: 'pending',
            attempts: 0,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          },
        })
      );

      // Send verification email via SES
      try {
        const senderEmail = process.env.SES_SENDER_EMAIL || 'noreply@rigidrent.com';
        await sesClient.send(
          new SendEmailCommand({
            Source: senderEmail,
            Destination: { ToAddresses: [emailLower] },
            Message: {
              Subject: { Data: `Your RIGID Residential verification code: ${verificationCode}` },
              Body: {
                Html: {
                  Data: `
                    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                      <h2 style="color: #111827; margin-bottom: 8px;">Welcome to RIGID Residential!</h2>
                      <p style="color: #6b7280; margin-bottom: 24px;">Please verify your email address to complete your registration.</p>
                      <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Your verification code:</p>
                        <p style="color: #111827; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace; margin: 0;">${verificationCode}</p>
                      </div>
                      <p style="color: #9ca3af; font-size: 13px;">This code expires in 30 minutes. If you didn't request this, please ignore this email.</p>
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                      <p style="color: #9ca3af; font-size: 12px;">RIGID Residential Property Management</p>
                    </div>
                  `,
                },
                Text: {
                  Data: `Welcome to RIGID Residential!\n\nYour email verification code is: ${verificationCode}\n\nThis code expires in 30 minutes.\n\nIf you didn't request this, please ignore this email.`,
                },
              },
            },
          })
        );
        console.log(`Verification email sent to ${emailLower}`);
        requiresVerification = true;
      } catch (sesError: any) {
        console.error('SES error sending verification email:', sesError);
        // If SES fails (e.g. sandbox mode, unverified recipient), auto-verify so user isn't stuck
        console.log('Auto-verifying email due to SES failure');
        await cognitoClient.adminUpdateUserAttributes({
          UserPoolId: userPoolId,
          Username: cognitoUsername,
          UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
        });
        requiresVerification = false;
      }
    }

    return response(201, {
      message: requiresVerification
        ? 'Account created! Please check your email for a verification code.'
        : 'Registration successful! You can now log in to the resident portal.',
      email: emailLower,
      unitNumber: inviteCode.unitNumber,
      buildingName: inviteCode.buildingName,
      requiresVerification,
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
