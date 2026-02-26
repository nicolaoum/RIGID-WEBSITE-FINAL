import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';
import { corsHeaders } from './shared/cors';
import { sanitizeText, sanitizeEmail, sanitizePhone } from './shared/sanitize';

const dynamoClient = new DynamoDB({});

/**
 * POST /inquiries
 * Stores general inquiries from potential residents into DynamoDB.
 * This is a public endpoint — all inputs are sanitized to prevent XSS/injection.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const body = JSON.parse(event.body || '{}');

    // Sanitize all inputs
    const name = sanitizeText(body.name, 200);
    const email = sanitizeEmail(body.email);
    const phone = body.phone ? sanitizePhone(body.phone) : undefined;
    const subject = body.subject ? sanitizeText(body.subject, 500) : undefined;
    const message = sanitizeText(body.message, 5000);

    // Validate required fields
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing or invalid required fields: name, email, message',
        }),
      };
    }

    const inquiriesTable = process.env.INQUIRIES_TABLE || 'rigid-inquiries';
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // Build DynamoDB item with sanitized data
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

    console.log('Inquiry saved:', { id, name, email: email.substring(0, 3) + '***', subject });

    return {
      statusCode: 200,
      headers,
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
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to process inquiry',
      }),
    };
  }
};
