import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProvider({});

export const handler = async (event: any) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  const residentsTable = process.env.RESIDENTS_TABLE;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!residentsTable || !userPoolId) {
    console.error('Missing environment variables');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Configuration error' }),
    };
  }

  try {
    // Scan for all pending residents
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: residentsTable,
        FilterExpression: '#status = :pending',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pending': 'pending',
        },
      })
    );

    const pendingResidents = scanResult.Items || [];
    console.log(`Found ${pendingResidents.length} pending residents`);

    const results = {
      checked: pendingResidents.length,
      activated: 0,
      stillPending: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const resident of pendingResidents) {
      const email = resident.email;
      const residentId = resident.id;

      try {
        // Check if user exists in Cognito with this email
        const listResult = await cognitoClient.listUsers({
          UserPoolId: userPoolId,
          Filter: `email = "${email}"`,
          Limit: 1,
        });

        if (listResult.Users && listResult.Users.length > 0) {
          const user = listResult.Users[0];
          const username = user.Username!;

          // User exists in Cognito - activate them
          console.log(`Found Cognito user ${username} for pending resident ${email}`);

          // Add to resident group
          try {
            await cognitoClient.adminAddUserToGroup({
              UserPoolId: userPoolId,
              Username: username,
              GroupName: 'resident',
            });
            console.log(`Added ${username} to resident group`);
          } catch (groupError: any) {
            // User might already be in group
            if (groupError.name !== 'UserNotFoundException') {
              console.log(`User ${username} may already be in resident group`);
            }
          }

          // Update user attributes
          const userAttributes: any[] = [
            { Name: 'custom:apartmentNumber', Value: resident.unitNumber },
          ];

          if (resident.buildingId && resident.buildingId !== 'unassigned') {
            userAttributes.push({
              Name: 'custom:buildingId',
              Value: resident.buildingId,
            });
          }

          try {
            await cognitoClient.adminUpdateUserAttributes({
              UserPoolId: userPoolId,
              Username: username,
              UserAttributes: userAttributes,
            });
          } catch (attrError) {
            console.error(`Error updating attributes for ${username}:`, attrError);
          }

          // Update DynamoDB status to active
          await docClient.send(
            new UpdateCommand({
              TableName: residentsTable,
              Key: { id: residentId },
              UpdateExpression: 'SET #status = :active, updatedAt = :now',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':active': 'active',
                ':now': new Date().toISOString(),
              },
            })
          );

          console.log(`Activated resident ${email}`);
          results.activated++;
          results.details.push({ email, status: 'activated' });
        } else {
          // User not found in Cognito - still pending
          console.log(`No Cognito user found for ${email}, keeping as pending`);
          results.stillPending++;
          results.details.push({ email, status: 'still_pending' });
        }
      } catch (error: any) {
        console.error(`Error processing resident ${email}:`, error);
        results.errors++;
        results.details.push({ email, status: 'error', message: error.message });
      }
    }

    console.log('Sync results:', results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Checked ${results.checked} pending residents. Activated: ${results.activated}, Still pending: ${results.stillPending}, Errors: ${results.errors}`,
        results,
      }),
    };
  } catch (error) {
    console.error('Error syncing pending residents:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to sync pending residents',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
