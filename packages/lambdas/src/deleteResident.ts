import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, AdminRemoveUserFromGroupCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { corsHeaders } from './shared/cors';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const cognitoClient = new CognitoIdentityProviderClient({ region: 'us-east-1' });

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

    // Check if user is admin
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
        headers,
        body: JSON.stringify({ message: 'Access denied. Admin or staff role required.' }),
      };
    }

    // Get resident ID from path (can be DynamoDB id, email, or Cognito username)
    const residentId = decodeURIComponent(event.pathParameters?.id || '');
    
    // Get cognitoUsername from query parameters if provided
    const cognitoUsernameFromQuery = event.queryStringParameters?.cognitoUsername 
      ? decodeURIComponent(event.queryStringParameters.cognitoUsername)
      : null;
    
    if (!residentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Resident ID is required' }),
      };
    }

    console.log('Delete request for residentId:', residentId, 'cognitoUsername from query:', cognitoUsernameFromQuery);

    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    // First, get the resident info from DynamoDB to find their email
    let residentEmail: string | null = null;
    let residentDbId: string | null = null;
    let cognitoUsername: string | null = null;
    
    try {
      const getResult = await docClient.send(
        new GetCommand({
          TableName: process.env.RESIDENTS_TABLE,
          Key: { id: residentId },
        })
      );
      
      if (getResult.Item) {
        residentEmail = getResult.Item.email;
        residentDbId = getResult.Item.id;
      }
    } catch (error) {
      console.error('Error fetching resident from DynamoDB:', error);
    }

    // If we still don't have an email, try GSI lookup by email (using the path value as email)
    if (!residentEmail && typeof residentId === 'string' && residentId.includes('@')) {
      try {
        const queryResult = await docClient.send(
          new QueryCommand({
            TableName: process.env.RESIDENTS_TABLE,
            IndexName: 'email-index',
            KeyConditionExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': residentId.toLowerCase(),
            },
            Limit: 1,
          })
        );
        if (queryResult.Items && queryResult.Items.length > 0) {
          residentEmail = queryResult.Items[0].email;
          residentDbId = queryResult.Items[0].id;
        }
      } catch (queryError) {
        console.error('Error querying resident by email index:', queryError);
      }
    }

    // Fallback: if not found but the path id looks like an email, use it directly
    if (!residentEmail && typeof residentId === 'string' && residentId.includes('@')) {
      // The ID might be in format "email-timestamp", extract the email part
      const emailMatch = residentId.match(/^([^@]+@[^@]+\.[^-]+)/);
      if (emailMatch) {
        residentEmail = emailMatch[1].toLowerCase();
      } else {
        residentEmail = residentId.toLowerCase();
      }
    }

    // Also try to extract email from ID format like "email@domain.com-timestamp"
    if (!residentEmail && typeof residentId === 'string') {
      const parts = residentId.split('-');
      // Check if first part looks like an email
      if (parts.length > 1) {
        const potentialEmail = parts.slice(0, -1).join('-'); // Everything except last part (timestamp)
        if (potentialEmail.includes('@')) {
          residentEmail = potentialEmail.toLowerCase();
        }
      }
    }

    console.log('Attempting to delete resident. ID:', residentId, 'Email:', residentEmail);

    // If we have a user pool, try to remove from Cognito group
    if (userPoolId) {
      let removed = false;
      
      // FIRST PRIORITY: If cognitoUsername was provided in query params, try that first
      if (!removed && cognitoUsernameFromQuery) {
        try {
          console.log(`Trying to remove cognitoUsername from query: ${cognitoUsernameFromQuery}...`);
          await cognitoClient.send(
            new AdminRemoveUserFromGroupCommand({
              UserPoolId: userPoolId,
              Username: cognitoUsernameFromQuery,
              GroupName: 'resident',
            })
          );
          console.log(`Successfully removed ${cognitoUsernameFromQuery} from Cognito resident group`);
          removed = true;
        } catch (e: any) {
          console.log(`Could not remove ${cognitoUsernameFromQuery} from query: ${e.message}`);
        }
      }
      
      // Second, try using the residentId directly as Cognito username (e.g., "Torcy2006")
      if (!removed && residentId && !residentId.includes('@') && !residentId.includes('-')) {
        try {
          console.log(`Trying to remove ${residentId} directly as Cognito username...`);
          await cognitoClient.send(
            new AdminRemoveUserFromGroupCommand({
              UserPoolId: userPoolId,
              Username: residentId,
              GroupName: 'resident',
            })
          );
          console.log(`Successfully removed ${residentId} from Cognito resident group`);
          removed = true;
        } catch (e: any) {
          console.log(`Could not remove ${residentId} directly: ${e.message}`);
        }
      }
      
      // If we have an email, try to find and remove by email
      if (!removed && residentEmail) {
        try {
          // Find the Cognito user with this email
          const listResult = await cognitoClient.send(
            new ListUsersCommand({
              UserPoolId: userPoolId,
              Filter: `email = "${residentEmail}"`,
              Limit: 1,
            })
          );

          console.log('Cognito ListUsers result:', JSON.stringify(listResult.Users));

          if (listResult.Users && listResult.Users.length > 0 && listResult.Users[0].Username) {
            const username = listResult.Users[0].Username;
            
            console.log(`Found Cognito user: ${username}, removing from resident group...`);
            
            // Remove from resident group
            await cognitoClient.send(
              new AdminRemoveUserFromGroupCommand({
                UserPoolId: userPoolId,
                Username: username,
                GroupName: 'resident',
              })
            );
            console.log(`Successfully removed ${username} (${residentEmail}) from Cognito resident group`);
            removed = true;
          }
        } catch (cognitoError: any) {
          console.log('Could not remove by email lookup:', cognitoError.message);
        }
      }
      
      // Final fallback: try various username formats
      if (!removed) {
        const usernamesToTry = [
          cognitoUsernameFromQuery,
          residentId,
          residentEmail,
          residentEmail?.split('@')[0],
        ].filter(Boolean) as string[];
        
        for (const username of usernamesToTry) {
          try {
            console.log(`Fallback: trying to remove ${username}...`);
            await cognitoClient.send(
              new AdminRemoveUserFromGroupCommand({
                UserPoolId: userPoolId,
                Username: username,
                GroupName: 'resident',
              })
            );
            console.log(`Fallback: successfully removed ${username} from Cognito resident group`);
            removed = true;
            break;
          } catch (e: any) {
            console.log(`Fallback: Could not remove ${username}: ${e.message}`);
          }
        }
      }
      
      if (!removed) {
        console.log('Warning: Could not remove user from Cognito resident group');
      }
    } else {
      console.log('No user pool configured');
    }

    // Delete resident from DynamoDB (by path id, plus any alternate id we found)
    const deletePromises = [
      docClient.send(
        new DeleteCommand({
          TableName: process.env.RESIDENTS_TABLE,
          Key: { id: residentId },
        })
      ),
    ];

    if (residentDbId && residentDbId !== residentId) {
      deletePromises.push(
        docClient.send(
          new DeleteCommand({
            TableName: process.env.RESIDENTS_TABLE,
            Key: { id: residentDbId },
          })
        )
      );
    }

    await Promise.all(deletePromises);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Resident deleted successfully' }),
    };
  } catch (error) {
    console.error('Error deleting resident:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to delete resident',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
