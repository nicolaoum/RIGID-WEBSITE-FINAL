import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  console.log('Starting cleanup of closed tickets older than 60 days');
  
  try {
    const tableName = process.env.TICKETS_TABLE;
    if (!tableName) {
      throw new Error('TICKETS_TABLE environment variable not set');
    }

    // Calculate the cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    const cutoffTimestamp = cutoffDate.toISOString();

    console.log(`Cutoff date: ${cutoffTimestamp}`);

    // Scan for closed/resolved tickets older than 60 days
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: '(#status = :closed OR #status = :resolved) AND updatedAt < :cutoff',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':closed': 'closed',
          ':resolved': 'resolved',
          ':cutoff': cutoffTimestamp,
        },
      })
    );

    const ticketsToDelete = scanResult.Items || [];
    console.log(`Found ${ticketsToDelete.length} tickets to delete`);

    if (ticketsToDelete.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No tickets to delete',
          deletedCount: 0,
        }),
      };
    }

    // Delete each ticket
    let deletedCount = 0;
    for (const ticket of ticketsToDelete) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              id: ticket.id,
              createdAt: ticket.createdAt,
            },
          })
        );
        deletedCount++;
        console.log(`Deleted ticket: ${ticket.id} (${ticket.subject})`);
      } catch (error) {
        console.error(`Failed to delete ticket ${ticket.id}:`, error);
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} out of ${ticketsToDelete.length} tickets`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Cleanup complete',
        deletedCount,
        totalFound: ticketsToDelete.length,
      }),
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error during cleanup',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
