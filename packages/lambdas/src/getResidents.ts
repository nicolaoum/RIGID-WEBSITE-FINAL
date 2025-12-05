import { CognitoIdentityProviderClient, ListUsersInGroupCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });

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

    // Get all users in the resident group from Cognito
    const residentsResponse = await cognito.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: 'resident',
      })
    );

    // Fetch full user details for each resident
    const residents = await Promise.all(
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

          return {
            username: user.Username,
            email: attributes.email,
            name: attributes.name,
            phoneNumber: attributes.phone_number,
            unitNumber: attributes['custom:apartmentNumber'],
            status: userDetails.UserStatus,
            createdAt: userDetails.UserCreateDate,
          };
        } catch (error) {
          console.error(`Error fetching user ${user.Username}:`, error);
          return null;
        }
      })
    );

    // Filter out null values
    const validResidents = residents.filter((r) => r !== null);

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
