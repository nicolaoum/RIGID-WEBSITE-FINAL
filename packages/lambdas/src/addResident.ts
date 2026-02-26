import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from './shared/cors';

const cognitoClient = new CognitoIdentityProvider({});
const dynamoClient = new DynamoDB({});

export const handler = async (event: any) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    // Get user info from Cognito authorizer
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers,
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

    const isAdmin = groups.includes('admin') || groups.includes('staff');
    
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ message: 'Access denied. Admin role required.' }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { email, unitNumber, buildingId, phoneNumber, name } = body;

    // Validate required fields
    if (!email || !unitNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Email and unit number are required' }),
      };
    }

    const emailLower = email.toLowerCase();
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const residentsTableName = process.env.RESIDENTS_TABLE_NAME || 'rigid-residents';

    if (!userPoolId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'User pool ID not configured' }),
      };
    }

    const residentId = `${emailLower}-${Date.now()}`;
    const now = new Date().toISOString();

    // STEP 0: Check for existing resident in the same apartment+building and remove them
    if (buildingId) {
      console.log(`Checking for existing residents in apartment ${unitNumber}, building ${buildingId}`);
      
      try {
        // Scan for residents with same unitNumber and buildingId
        const existingResult = await dynamoClient.scan({
          TableName: residentsTableName,
          FilterExpression: 'attribute_exists(unitNumber) AND unitNumber = :unitNum AND attribute_exists(buildingId) AND buildingId = :buildId',
          ExpressionAttributeValues: {
            ':unitNum': { S: unitNumber },
            ':buildId': { S: buildingId },
          },
        });

        if (existingResult.Items && existingResult.Items.length > 0) {
          // Remove each existing resident from this apartment
          for (const item of existingResult.Items) {
            const existingId = item.id?.S;
            const existingEmail = item.email?.S;
            
            if (existingId) {
              console.log(`Removing existing resident ${existingEmail} from apartment ${unitNumber} in building ${buildingId}`);
              
              // Delete from DynamoDB
              await dynamoClient.deleteItem({
                TableName: residentsTableName,
                Key: {
                  id: { S: existingId },
                },
              });

              // Remove from Cognito resident group if they exist
              if (existingEmail) {
                try {
                  await cognitoClient.adminRemoveUserFromGroup({
                    UserPoolId: userPoolId,
                    Username: existingEmail,
                    GroupName: 'resident',
                  });
                  console.log(`Removed ${existingEmail} from resident group in Cognito`);
                } catch (error: any) {
                  // User might not exist yet, that's ok
                  if (error.name !== 'UserNotFoundException') {
                    console.error(`Error removing user from group: ${error.message}`);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking/removing existing residents:', error);
        // Continue anyway - it's not critical
      }
    }

    // STEP 1: Save resident to DynamoDB with status 'pending'
    const dynamoItem: any = {
      id: { S: residentId },
      email: { S: emailLower },
      unitNumber: { S: unitNumber },
      buildingId: { S: buildingId || 'unassigned' },
      status: { S: 'pending' },
      createdAt: { S: now },
      updatedAt: { S: now },
    };

    // Add name if provided
    if (name) {
      dynamoItem.name = { S: name };
    }

    // Add phone number if provided
    if (phoneNumber) {
      dynamoItem.phoneNumber = { S: phoneNumber };
    }

    await dynamoClient.putItem({
      TableName: residentsTableName,
      Item: dynamoItem,
    });

    console.log(`Resident ${emailLower} added to DynamoDB with status 'pending'`);

    // STEP 2: Try to add to Cognito if user already exists with this exact email
    let cognitoStatus = 'not-created-yet';
    try {
      // Use listUsers with exact email filter to find user with this email
      const listResult = await cognitoClient.listUsers({
        UserPoolId: userPoolId,
        Filter: `email = "${emailLower}"`,
        Limit: 1,
      });

      // Check if we found a user with this exact email
      if (!listResult.Users || listResult.Users.length === 0) {
        console.log(`No Cognito user found with email ${emailLower}, treating as pending`);
        throw { name: 'UserNotFoundException', message: 'User not found' };
      }

      const user = listResult.Users[0];
      const username = user.Username!;
      
      // Double-check the email matches exactly
      const userEmail = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
      if (!userEmail || userEmail.toLowerCase() !== emailLower) {
        console.log(`User lookup returned different email (${userEmail}), treating as pending`);
        throw { name: 'UserNotFoundException', message: 'Email mismatch' };
      }

      console.log(`Found Cognito user ${username} with matching email ${emailLower}`);

      // Now add to resident group
      await cognitoClient.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: username, // Use actual username, not email
        GroupName: 'resident',
      });

      console.log(`User ${username} added to resident group in Cognito`);

      // Update user attributes to include name, apartment number, and building ID
      const userAttributes: any[] = [
        {
          Name: 'name',
          Value: username,
        },
        {
          Name: 'custom:apartmentNumber',
          Value: unitNumber,
        },
      ];

      if (buildingId) {
        userAttributes.push({
          Name: 'custom:buildingId',
          Value: buildingId,
        });
      }

      if (phoneNumber) {
        // Format phone number to E.164 format if not already formatted
        let formattedPhone = phoneNumber.trim();
        if (!formattedPhone.startsWith('+')) {
          // Assume Cyprus country code if no country code provided
          formattedPhone = `+357${formattedPhone.replace(/^0+/, '')}`;
        }
        userAttributes.push({
          Name: 'phone_number',
          Value: formattedPhone,
        });
      }

      await cognitoClient.adminUpdateUserAttributes({
        UserPoolId: userPoolId,
        Username: username, // Use actual username, not email
        UserAttributes: userAttributes,
      });

      console.log(`User ${username} updated with apartment and building info`);

      // Update DynamoDB status to 'active'
      await dynamoClient.updateItem({
        TableName: residentsTableName,
        Key: { id: { S: residentId } },
        UpdateExpression: 'SET #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'active' },
          ':now': { S: new Date().toISOString() },
        },
      });

      cognitoStatus = 'added-to-cognito';
    } catch (error: any) {
      // User doesn't exist yet - that's OK, they will sign up later
      if (error.name === 'UserNotFoundException') {
        console.log(`User ${emailLower} not in Cognito yet. Will be activated when they sign up.`);
        cognitoStatus = 'pending-signup';
      } else {
        throw error;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Resident added successfully',
        residentId: residentId,
        email: emailLower,
        unitNumber: unitNumber,
        buildingId: buildingId || null,
        status: cognitoStatus === 'added-to-cognito' ? 'active' : 'pending',
        cognitoStatus: cognitoStatus,
      }),
    };
  } catch (error) {
    console.error('Error adding resident:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to add resident',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
