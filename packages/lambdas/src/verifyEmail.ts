import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const cognitoClient = new CognitoIdentityProvider({});
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /invite-codes/verify-email
 * Public endpoint — tenant submits the 6-digit code sent to their email
 * Verifies the code and marks email as verified in Cognito
 */
export const handler = async (event: any) => {
  console.log('Verify Email Request:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, verificationCode } = body;

    if (!email || !verificationCode) {
      return response(400, { message: 'Email and verification code are required' });
    }

    const emailLower = email.toLowerCase().trim();
    const codeInput = verificationCode.trim();

    // Look up the verification record
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        Key: { code: `VERIFY-${emailLower}` },
      })
    );

    if (!result.Item) {
      return response(404, { message: 'No verification pending for this email. Please register first.' });
    }

    const record = result.Item;

    // Check if already verified
    if (record.status === 'verified') {
      return response(200, { message: 'Email already verified. You can log in now.', verified: true });
    }

    // Check expiry (30 minutes)
    if (new Date(record.expiresAt) < new Date()) {
      return response(410, { message: 'Verification code has expired. Please register again.' });
    }

    // Check attempts (max 5)
    const attempts = record.attempts || 0;
    if (attempts >= 5) {
      return response(429, { message: 'Too many attempts. Please register again to get a new code.' });
    }

    // Check the code
    if (record.verificationCode !== codeInput) {
      // Increment attempts
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.INVITE_CODES_TABLE,
          Key: { code: `VERIFY-${emailLower}` },
          UpdateExpression: 'SET attempts = :attempts',
          ExpressionAttributeValues: { ':attempts': attempts + 1 },
        })
      );
      return response(400, { message: `Invalid verification code. ${4 - attempts} attempts remaining.` });
    }

    // Code is correct — mark email as verified in Cognito
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      return response(500, { message: 'Server configuration error' });
    }

    try {
      await cognitoClient.adminUpdateUserAttributes({
        UserPoolId: userPoolId,
        Username: record.cognitoUsername,
        UserAttributes: [
          { Name: 'email_verified', Value: 'true' },
        ],
      });
      console.log(`Email verified for ${emailLower} (${record.cognitoUsername})`);
    } catch (error: any) {
      console.error('Failed to verify email in Cognito:', error);
      return response(500, { message: 'Failed to verify email. Please try again.' });
    }

    // Mark verification record as complete
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.INVITE_CODES_TABLE,
        Key: { code: `VERIFY-${emailLower}` },
        UpdateExpression: 'SET #status = :verified, verifiedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':verified': 'verified',
          ':now': new Date().toISOString(),
        },
      })
    );

    return response(200, {
      message: 'Email verified successfully! You can now log in.',
      verified: true,
      email: emailLower,
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return response(500, {
      message: 'Verification failed. Please try again.',
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
