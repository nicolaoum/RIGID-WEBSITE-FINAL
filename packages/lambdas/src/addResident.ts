import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProvider({});

export const handler = async (event: any) => {
  console.log('Authorize Resident Request:', JSON.stringify(event, null, 2));

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

    const isAdmin = groups.includes('admin') || groups.includes('staff');
    
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
    const { email, unitNumber, buildingId } = body;

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
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    if (!userPoolId) {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'User pool ID not configured' }),
      };
    }

    // Add user to 'resident' group in Cognito
    try {
      await cognitoClient.adminAddUserToGroup({
        UserPoolId: userPoolId,
        Username: emailLower,
        GroupName: 'resident',
      });

      console.log(`User ${emailLower} added to resident group`);
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
          },
          body: JSON.stringify({ message: 'User not found in Cognito. Please ensure the user has created an account.' }),
        };
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Resident authorized successfully',
        email: emailLower,
        unitNumber: unitNumber,
        buildingId: buildingId || null,
      }),
    };
  } catch (error) {
    console.error('Error authorizing resident:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to authorize resident',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
