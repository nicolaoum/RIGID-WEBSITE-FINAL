import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * POST /tickets
 * Creates a new maintenance ticket (requires authentication)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('POST /tickets request:', JSON.stringify(event, null, 2));

  try {
    // Extract user from Cognito authorizer context
    console.log('Authorizer:', event.requestContext.authorizer);
    const userEmail = event.requestContext.authorizer?.claims?.email || 'unknown@example.com';
    const userId = event.requestContext.authorizer?.claims?.sub || 'unknown';
    console.log('User:', { userId, userEmail });

    const body = JSON.parse(event.body || '{}');
    const { subject, description, priority, residentName, unitNumber, phoneNumber, allowEntry } = body;

    // Validate required fields
    if (!subject || !description || !priority) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: subject, description, priority',
        }),
      };
    }

    // Generate ticket ID
    const ticketId = randomUUID();
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

    console.log('Ticket created:', ticket);

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        success: false,
        message: 'Failed to create ticket',
      }),
    };
  }
};
