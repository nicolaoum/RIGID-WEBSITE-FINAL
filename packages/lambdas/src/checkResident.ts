import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  console.log('Check Resident Request:', JSON.stringify(event, null, 2));

  try {
    // Get user email from Cognito claims
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Unauthorized', isResident: false }),
      };
    }

    const userEmail = claims.email?.toLowerCase();
    const username = claims['cognito:username'] || userEmail; // Get actual Cognito username
    
    if (!userEmail) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Email not found in token', isResident: false }),
      };
    }

    // Check user's Cognito groups
    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map(g => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    // Check if user is admin or staff (they always have access)
    if (groups.includes('admin') || groups.includes('staff')) {
      // Still fetch resident info if they have a resident record (for testing/staff who are also residents)
      let residentDataToReturn = null;
      try {
        const result = await docClient.send(
          new QueryCommand({
            TableName: process.env.RESIDENTS_TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': userEmail,
            },
            Limit: 1,
          })
        );

        if (result.Items && result.Items.length > 0) {
          const residentInfo = result.Items[0];
          
          // Fetch building name if buildingId exists
          let buildingName = null;
          if (residentInfo.buildingId && residentInfo.buildingId !== 'unassigned') {
            try {
              const buildingResult = await docClient.send(
                new GetCommand({
                  TableName: process.env.BUILDINGS_TABLE,
                  Key: { id: residentInfo.buildingId },
                })
              );
              if (buildingResult.Item) {
                buildingName = buildingResult.Item.name;
              }
            } catch (buildingError) {
              console.error('Error fetching building name:', buildingError);
            }
          }
          
          residentDataToReturn = {
            id: residentInfo.id,
            email: residentInfo.email,
            unitNumber: residentInfo.unitNumber,
            buildingId: residentInfo.buildingId,
            buildingName: buildingName,
            status: residentInfo.status,
            createdAt: residentInfo.createdAt,
            updatedAt: residentInfo.updatedAt,
            phoneNumber: residentInfo.phoneNumber,
          };
        } else {
          // Not in DynamoDB - try fetching from Cognito user attributes
          try {
            const userPoolId = process.env.COGNITO_USER_POOL_ID;
            if (userPoolId) {
              const { CognitoIdentityProvider } = await import('@aws-sdk/client-cognito-identity-provider');
              const cognitoClient = new CognitoIdentityProvider({});
              
              const userDetails = await cognitoClient.adminGetUser({
                UserPoolId: userPoolId,
                Username: username,
              });

              const apartmentAttr = userDetails.UserAttributes?.find(attr => attr.Name === 'custom:apartmentNumber');
              const buildingAttr = userDetails.UserAttributes?.find(attr => attr.Name === 'custom:buildingId');

              if (apartmentAttr?.Value) {
                residentDataToReturn = {
                  id: userEmail,
                  email: userEmail,
                  unitNumber: apartmentAttr.Value,
                  buildingId: buildingAttr?.Value || 'unassigned',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                console.log('Fetched resident info from Cognito attributes:', residentDataToReturn);
              }
            }
          } catch (cognitoError) {
            console.error('Error fetching Cognito user attributes:', cognitoError);
          }
        }
      } catch (error) {
        console.error('Error fetching resident info for staff:', error);
      }

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ isResident: true, isStaff: true, residentInfo: residentDataToReturn }),
      };
    }

    // Check if user is in the resident group
    const isResident = groups.includes('resident');

    let residentInfo = null;
    let shouldActivate = false;
    
    // Check DynamoDB residents table (for pre-added residents) - always fetch to get resident details
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: process.env.RESIDENTS_TABLE,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': userEmail,
          },
          Limit: 1,
        })
      );

      if (result.Items && result.Items.length > 0) {
        residentInfo = result.Items[0];
        console.log('Found resident in DynamoDB:', residentInfo);
        console.log('Resident unitNumber:', residentInfo.unitNumber);
        console.log('Resident buildingId:', residentInfo.buildingId);
        console.log('Resident status:', residentInfo.status);
        
        // If resident is in the database but NOT in Cognito group yet, they just signed up
        // We should add them to the resident group automatically
        if (!isResident && residentInfo.status === 'pending') {
          shouldActivate = true;
        }
      } else {
        console.log('No resident found in DynamoDB for email:', userEmail);
      }
    } catch (error) {
      console.error('Error fetching resident info from DynamoDB:', error);
      // Continue even if DynamoDB lookup fails
    }

    // If this is a new signup for a pre-added resident, activate them now
    let finalIsResident = isResident;
    if (shouldActivate && residentInfo) {
      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (userPoolId) {
          const { CognitoIdentityProvider } = await import('@aws-sdk/client-cognito-identity-provider');
          const cognitoClient = new CognitoIdentityProvider({});
          
          // Add to resident group
          await cognitoClient.adminAddUserToGroup({
            UserPoolId: userPoolId,
            Username: username,
            GroupName: 'resident',
          });

          // Update attributes
          const userDetails = await cognitoClient.adminGetUser({
            UserPoolId: userPoolId,
            Username: username,
          });

          const displayName = userDetails.Username || username;

          // Update standard attributes only — custom ones are in DynamoDB
          const userAttributes: any[] = [
            { Name: 'name', Value: displayName },
          ];

          try {
            await cognitoClient.adminUpdateUserAttributes({
              UserPoolId: userPoolId,
              Username: username,
              UserAttributes: userAttributes,
            });
          } catch (attrError: any) {
            console.error(`Error updating attributes for ${username}:`, attrError);
          }

          // Update DynamoDB status to 'active'
          await docClient.send(
            new UpdateCommand({
              TableName: process.env.RESIDENTS_TABLE,
              Key: {
                id: residentInfo.id,
              },
              UpdateExpression: 'SET #status = :status',
              ExpressionAttributeNames: {
                '#status': 'status',
              },
              ExpressionAttributeValues: {
                ':status': 'active',
              },
            })
          );

          console.log(`Automatically activated resident ${userEmail} from pending signup and updated DynamoDB status`);
          finalIsResident = true;
          // Update local residentInfo status so we return the correct status
          residentInfo.status = 'active';
        }
      } catch (error) {
        console.error('Error activating pending resident:', error);
        // Continue anyway - they're still a resident
        finalIsResident = true;
      }
    }

    console.log('Final response - isResident:', finalIsResident || isResident, 'residentInfo:', residentInfo);
    
    // Extract resident details to return to frontend
    let residentDataToReturn = null;
    if (residentInfo) {
      // Fetch building name if buildingId exists
      let buildingName = null;
      if (residentInfo.buildingId && residentInfo.buildingId !== 'unassigned') {
        try {
          const buildingResult = await docClient.send(
            new GetCommand({
              TableName: process.env.BUILDINGS_TABLE,
              Key: { id: residentInfo.buildingId },
            })
          );
          if (buildingResult.Item) {
            buildingName = buildingResult.Item.name;
          }
        } catch (buildingError) {
          console.error('Error fetching building name:', buildingError);
        }
      }
      
      residentDataToReturn = {
        id: residentInfo.id,
        email: residentInfo.email,
        unitNumber: residentInfo.unitNumber,
        buildingId: residentInfo.buildingId,
        buildingName: buildingName,
        status: residentInfo.status,
        createdAt: residentInfo.createdAt,
        updatedAt: residentInfo.updatedAt,
        phoneNumber: residentInfo.phoneNumber,
      };
      console.log('✅ Extracted residentDataToReturn:', residentDataToReturn);
    } else {
      console.log('❌ residentInfo is null, trying Cognito attributes');
      // Not in DynamoDB - try fetching from Cognito user attributes
      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (userPoolId) {
          const { CognitoIdentityProvider } = await import('@aws-sdk/client-cognito-identity-provider');
          const cognitoClient = new CognitoIdentityProvider({});
          
          const userDetails = await cognitoClient.adminGetUser({
            UserPoolId: userPoolId,
            Username: username,
          });

          const apartmentAttr = userDetails.UserAttributes?.find(attr => attr.Name === 'custom:apartmentNumber');
          const buildingAttr = userDetails.UserAttributes?.find(attr => attr.Name === 'custom:buildingId');

          if (apartmentAttr?.Value) {
            residentDataToReturn = {
              id: userEmail,
              email: userEmail,
              unitNumber: apartmentAttr.Value,
              buildingId: buildingAttr?.Value || 'unassigned',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            console.log('✅ Fetched resident info from Cognito attributes:', residentDataToReturn);
          }
        }
      } catch (cognitoError) {
        console.error('Error fetching Cognito user attributes:', cognitoError);
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ 
        isResident: finalIsResident || isResident,
        residentInfo: residentDataToReturn,
        wasActivated: shouldActivate,
      }),
    };
  } catch (error) {
    console.error('Error checking resident status:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to check resident status',
        isResident: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
