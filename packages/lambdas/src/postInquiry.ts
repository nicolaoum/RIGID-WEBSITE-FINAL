import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const dynamoClient = new DynamoDB({});

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
};

/**
 * POST /inquiries
 * Stores general inquiries from potential residents into DynamoDB
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('POST /inquiries request:', event);

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, phone, subject, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: name, email, message',
        }),
      };
    }

    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // Build DynamoDB item
    const item: Record<string, any> = {
      id: { S: id },
      name: { S: name },
      email: { S: email },
      message: { S: message },
      status: { S: 'new' },
      createdAt: { S: createdAt },
    };

    if (phone) item.phone = { S: phone };
    if (subject) item.subject = { S: subject };

    await dynamoClient.putItem({
      TableName: inquiriesTable,
      Item: item,
    });

    console.log('Inquiry saved:', { id, name, email, subject });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your inquiry. We will contact you shortly.',
        inquiryId: id,
      }),
    };
  } catch (error) {
    console.error('Error processing inquiry:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'Failed to process inquiry',
      }),
    };
  }
};
