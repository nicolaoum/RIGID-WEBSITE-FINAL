import { APIGatewayProxyHandler } from 'aws-lambda';

/**
 * POST /inquiries
 * Handles general inquiries from potential residents
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('POST /inquiries request:', event);

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, phone, unitId, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: name, email, message',
        }),
      };
    }

    // Mock processing - In production, save to RDS and send notification email
    console.log('Inquiry received:', { name, email, phone, unitId, message });

    // TODO: Insert into RDS inquiries table
    // TODO: Send email notification to staff
    // TODO: Send confirmation email to inquirer

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your inquiry. We will contact you shortly.',
      }),
    };
  } catch (error) {
    console.error('Error processing inquiry:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to process inquiry',
      }),
    };
  }
};
