import { CognitoIdentityProviderClient, ListUsersInGroupCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: any) => {
  console.log('Get Residents Request:', JSON.stringify(event, null, 2));

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

    const isAuthorized = groups.includes('admin') || groups.includes('staff');
    
    if (!isAuthorized) {
      return {
        statusCode: 403,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Access denied. Admin or staff role required.' }),
      };
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const residentsTableName = process.env.RESIDENTS_TABLE || 'rigid-residents';
    
    if (!userPoolId) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'User pool not configured' }),
      };
    }

    // STEP 1: Get all residents from DynamoDB (both pending and active)
    let allResidents: any[] = [];
    
    try {
      const dbResult = await docClient.send(
        new ScanCommand({
          TableName: residentsTableName,
        })
      );
      
      if (dbResult.Items && dbResult.Items.length > 0) {
        allResidents = dbResult.Items.map((item: any) => ({
          id: item.id,
          email: item.email,
          name: item.name || item.email?.split('@')[0] || 'Unknown', // Use stored name or default to email prefix
          unitNumber: item.unitNumber,
          buildingId: item.buildingId,
          phoneNumber: item.phoneNumber,
          status: item.status || 'pending', // 'pending' or 'active'
          source: 'dynamodb',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      }
    } catch (error) {
      console.error('Error fetching from DynamoDB:', error);
    }

    // STEP 2: Enrich with Cognito data for active residents
    const residentsMap = new Map();
    
    // First, add all DynamoDB residents to the map
    allResidents.forEach(resident => {
      residentsMap.set(resident.email, resident);
    });

    try {
      // Get all users in the resident group from Cognito
      const residentsResponse = await cognito.send(
        new ListUsersInGroupCommand({
          UserPoolId: userPoolId,
          GroupName: 'resident',
        })
      );

      // Fetch full user details for each resident
      const cognitoResidents = await Promise.all(
        (residentsResponse.Users || []).map(async (user) => {
          try {
            const userDetails = await cognito.send(
              new AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: user.Username!,
              })
            );

            // Extract attributes
            const attributes: any = {};
            userDetails.UserAttributes?.forEach((attr) => {
              attributes[attr.Name!] = attr.Value;
            });

            // Check if this user exists in DynamoDB to get their ID
            const existingResident = residentsMap.get(attributes.email);
            
            return {
              id: existingResident?.id || attributes.email, // Use DynamoDB ID if available, fallback to email
              cognitoUsername: user.Username, // Store the Cognito username for deletion
              email: attributes.email,
              name: attributes.name || user.Username,
              phoneNumber: attributes.phone_number,
              unitNumber: attributes['custom:apartmentNumber'],
              buildingId: attributes['custom:buildingId'],
              status: 'active',
              source: 'cognito',
              createdAt: userDetails.UserCreateDate,
            };
          } catch (error) {
            console.error(`Error fetching user ${user.Username}:`, error);
            return null;
          }
        })
      );

      // Merge Cognito data, overwriting DynamoDB entries for active residents
      cognitoResidents.forEach(resident => {
        if (resident && resident.email) {
          residentsMap.set(resident.email, resident);
        }
      });
    } catch (error) {
      console.error('Error fetching from Cognito:', error);
      // Continue - we still have the DynamoDB residents
    }

    // Convert map to array and filter out nulls
    const validResidents = Array.from(residentsMap.values()).filter((r) => r !== null);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        residents: validResidents,
        count: validResidents.length,
      }),
    };
  } catch (error) {
    console.error('Error fetching residents:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to fetch residents',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
