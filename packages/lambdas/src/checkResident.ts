import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: JSON.stringify({ isResident: true, isStaff: true }),
      };
    }

    // Check if user is in the resident group
    const isResident = groups.includes('resident');

    let residentInfo = null;
    
    // If user is a resident, try to fetch their info from DynamoDB
    if (isResident) {
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
        }
      } catch (error) {
        console.error('Error fetching resident info from DynamoDB:', error);
        // Continue even if DynamoDB lookup fails
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ 
        isResident,
        residentInfo,
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
