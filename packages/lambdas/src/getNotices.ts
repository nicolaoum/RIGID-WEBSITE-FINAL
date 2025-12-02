import { APIGatewayProxyHandler } from 'aws-lambda';

/**
 * GET /notices
 * Returns all active notices for residents (requires authentication)
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('GET /notices request:', event);

  try {
    // Mock data - In production, query RDS for active notices
    const notices = [
      {
        id: 'notice-001',
        title: 'Scheduled Maintenance - Water Shutoff',
        content: 'Water will be shut off on Friday, December 6th from 9 AM to 12 PM for pipe maintenance.',
        type: 'warning',
        publishedAt: '2024-11-28T09:00:00Z',
        buildingId: null,
      },
      {
        id: 'notice-002',
        title: 'Holiday Office Hours',
        content: 'Our office will be closed December 24-26 for the holidays. Emergency maintenance available 24/7.',
        type: 'info',
        publishedAt: '2024-11-20T12:00:00Z',
        buildingId: null,
      },
      {
        id: 'notice-003',
        title: 'Package Room Update',
        content: 'New package lockers have been installed. Please pick up packages within 48 hours.',
        type: 'info',
        publishedAt: '2024-11-15T14:00:00Z',
        buildingId: 'bldg-001',
      },
    ];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(notices),
    };
  } catch (error) {
    console.error('Error fetching notices:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify([]),
    };
  }
};
