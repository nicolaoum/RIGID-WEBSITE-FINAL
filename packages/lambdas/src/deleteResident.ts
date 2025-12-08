import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminRemoveUserFromGroupCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  console.log('Delete Resident Request:', JSON.stringify(event, null, 2));

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

    // Check if user is admin
    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map(g => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    const isAdmin = groups.includes('admin');
    
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

    // Get resident ID from path
    const residentId = event.pathParameters?.id;
    
    if (!residentId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ message: 'Resident ID is required' }),
      };
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    // First, get the resident info from DynamoDB to find their email
    let residentEmail: string | null = null;
    try {
      const getResult = await docClient.send(
        new GetCommand({
          TableName: process.env.RESIDENTS_TABLE,
          Key: { id: residentId },
        })
      );
      
      if (getResult.Item) {
        residentEmail = getResult.Item.email;
      }
    } catch (error) {
      console.error('Error fetching resident from DynamoDB:', error);
    }

    // If we found the email and have a user pool, try to remove from Cognito group
    if (residentEmail && userPoolId) {
      try {
        // Import ListUsers to find user by email
        const { ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider');
        
        // Find the Cognito user with this email
        const listResult = await cognitoClient.send(
          new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `email = "${residentEmail}"`,
            Limit: 1,
          })
        );

        if (listResult.Users && listResult.Users.length > 0 && listResult.Users[0].Username) {
          const username = listResult.Users[0].Username;
          
          // Remove from resident group
          await cognitoClient.send(
            new AdminRemoveUserFromGroupCommand({
              UserPoolId: userPoolId,
              Username: username,
              GroupName: 'resident',
            })
          );
          console.log(`Removed ${username} (${residentEmail}) from Cognito resident group`);
        } else {
          console.log(`No Cognito user found with email ${residentEmail}`);
        }
      } catch (cognitoError: any) {
        // User might not exist in Cognito or might not be in the group - that's ok
        console.log('Could not remove from Cognito group (user may not exist):', cognitoError.message);
      }
    }

    // Delete resident from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: process.env.RESIDENTS_TABLE,
        Key: { id: residentId },
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ message: 'Resident deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting resident:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({
        message: 'Failed to delete resident',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
