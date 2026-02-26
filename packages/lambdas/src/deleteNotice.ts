import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDB({});

/**
 * DELETE /notices/{noticeId}
 * Delete a notice (staff/admin only)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('DELETE /notices/{noticeId} request:', event);

  try {
    const noticeId = event.pathParameters?.noticeId;

    if (!noticeId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Notice ID is required' }),
      };
    }

    const noticesTable = process.env.NOTICES_TABLE || process.env.NOTICES_TABLE_NAME || 'rigid-notices';

    // First, we need to find the notice to get its createdAt (sort key)
    const queryResult = await dynamoClient.query({
      TableName: noticesTable,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': { S: noticeId },
      },
    });

    if (!queryResult.Items || queryResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Notice not found' }),
      };
    }

    const notice = queryResult.Items[0];
    const createdAt = notice.createdAt?.S;

    if (!createdAt) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Notice has invalid data (missing createdAt)' }),
      };
    }

    // Delete the notice from DynamoDB using both partition key and sort key
    await dynamoClient.deleteItem({
      TableName: noticesTable,
      Key: {
        id: { S: noticeId },
        createdAt: { S: createdAt },
      },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Notice deleted successfully', noticeId }),
    };
  } catch (error) {
    console.error('Error deleting notice:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Error deleting notice' }),
    };
  }
};
