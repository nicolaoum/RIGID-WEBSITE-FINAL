import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { corsHeaders } from './shared/cors';
import { sanitizeText, sanitizeEnum } from './shared/sanitize';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /tickets
 * Creates a new maintenance ticket (requires authentication)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    // Extract user from Cognito authorizer context
    const userEmail = event.requestContext.authorizer?.claims?.email || 'unknown@example.com';
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';

    const body = JSON.parse(event.body || '{}');

    // Sanitize inputs
    const subject = sanitizeText(body.subject, 500);
    const description = sanitizeText(body.description, 10000);
    const priority = sanitizeEnum(body.priority, ['low', 'medium', 'high', 'urgent']);
    const residentName = body.residentName ? sanitizeText(body.residentName, 200) : undefined;
    const unitNumber = body.unitNumber ? sanitizeText(body.unitNumber, 50) : undefined;
    const buildingId = body.buildingId ? sanitizeText(body.buildingId, 100) : undefined;
    const buildingName = body.buildingName ? sanitizeText(body.buildingName, 200) : undefined;
    const phoneNumber = body.phoneNumber ? sanitizeText(body.phoneNumber, 30) : undefined;
    const allowEntry = body.allowEntry === true;

    // Validate required fields
    if (!subject || !description || !priority) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: subject, description, priority',
        }),
      };
    }

    // Generate sequential ticket ID
    // Get all existing tickets to find the highest ID number
    let ticketNumber = 1;
    try {
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: process.env.TICKETS_TABLE,
          ProjectionExpression: 'id',
        })
      );

      if (scanResult.Items && scanResult.Items.length > 0) {
        // Extract numeric IDs and find the maximum
        const numericIds = scanResult.Items
          .map(item => {
            const id = item.id;
            // Try to parse as integer
            const num = parseInt(id, 10);
            return isNaN(num) ? 0 : num;
          })
          .filter(num => num > 0);

        if (numericIds.length > 0) {
          ticketNumber = Math.max(...numericIds) + 1;
        }
      }
    } catch (scanError) {
      console.error('Error scanning for max ticket ID:', scanError);
      // If scan fails, use timestamp-based ID as fallback
      ticketNumber = Date.now();
    }

    const ticketId = ticketNumber.toString();
    const now = new Date().toISOString();

    // Create ticket object
    const ticket = {
      id: ticketId,
      userId,
      residentEmail: userEmail,
      subject,
      description,
      priority,
      status: 'open',
      residentName,
      unitNumber,
      buildingId,
      buildingName,
      phoneNumber,
      allowEntry: allowEntry || false,
      createdAt: now,
      updatedAt: now,
    };

    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: process.env.TICKETS_TABLE,
        Item: ticket,
      })
    );

    console.log('Ticket created:', ticketId);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        ticketId,
        message: 'Maintenance ticket created successfully',
      }),
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to create ticket',
      }),
    };
  }
};
