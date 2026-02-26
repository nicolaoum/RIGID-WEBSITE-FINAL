import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

const SENDER_EMAIL = process.env.SES_SENDER_EMAIL || 'noreply@rigidrent.com';

interface Resident {
  id: string;
  email: string;
  name?: string;
  buildingId?: string;
  status?: string;
}

/**
 * POST /send-announcement-email
 * Sends an announcement via email to all active residents (or filtered by building)
 * Staff/admin only — auth enforced by API Gateway Cognito authorizer
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Verify caller is staff/admin
    const claims = event.requestContext?.authorizer?.claims;
    if (!claims) {
      return response(401, { message: 'Unauthorized' });
    }

    const groupsClaim = claims['cognito:groups'];
    let groups: string[] = [];
    if (typeof groupsClaim === 'string') {
      groups = groupsClaim.split(',').map(g => g.trim());
    } else if (Array.isArray(groupsClaim)) {
      groups = groupsClaim;
    }

    if (!groups.includes('admin') && !groups.includes('staff')) {
      return response(403, { message: 'Access denied. Staff or admin role required.' });
    }

    const body = JSON.parse(event.body || '{}');
    const { title, content, type, buildingId } = body;

    if (!title || !content || !type) {
      return response(400, { message: 'Missing required fields: title, content, type' });
    }

    // Fetch active residents from DynamoDB
    const residentsTable = process.env.RESIDENTS_TABLE || 'rigid-residents';
    const result = await docClient.send(new ScanCommand({
      TableName: residentsTable,
    }));

    let residents: Resident[] = (result.Items || []) as Resident[];

    // Only send to active residents with emails
    residents = residents.filter(r => r.email && r.status === 'active');

    // Filter by building if specified
    if (buildingId) {
      residents = residents.filter(r => r.buildingId === buildingId);
    }

    if (residents.length === 0) {
      return response(200, { 
        message: 'No active residents found to email.',
        sent: 0, 
        failed: 0 
      });
    }

    // Build the HTML email
    const typeEmoji = type === 'urgent' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️';
    const typeColor = type === 'urgent' ? '#DC2626' : type === 'warning' ? '#D97706' : '#2563EB';
    const typeBg = type === 'urgent' ? '#FEF2F2' : type === 'warning' ? '#FFFBEB' : '#EFF6FF';
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:#1e293b;border-radius:12px 12px 0 0;padding:30px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:1px;">RIGID</h1>
      <p style="color:#94a3b8;margin:5px 0 0;font-size:14px;">Residential Management</p>
    </div>
    
    <!-- Content -->
    <div style="background:#fff;padding:30px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
      <!-- Type Badge -->
      <div style="margin-bottom:20px;">
        <span style="display:inline-block;background:${typeBg};color:${typeColor};padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">
          ${typeEmoji} ${typeLabel}
        </span>
      </div>
      
      <!-- Title -->
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;font-weight:700;">${escapeHtml(title)}</h2>
      
      <!-- Body -->
      <div style="color:#475569;font-size:15px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(content)}</div>
      
      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      
      <!-- Footer info -->
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        📅 ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        ${buildingId ? '' : ' • All Buildings'}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Rigid Residential • Nicosia, Cyprus<br>
        You received this because you are a registered resident.
      </p>
    </div>
  </div>
</body>
</html>`;

    const textBody = `${typeEmoji} ${typeLabel}: ${title}\n\n${content}\n\n---\nRigid Residential • ${new Date().toLocaleDateString()}`;

    // Send emails (batch in groups of 50 to avoid SES throttling)
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const resident of residents) {
      try {
        await sesClient.send(new SendEmailCommand({
          Source: SENDER_EMAIL,
          Destination: {
            ToAddresses: [resident.email],
          },
          Message: {
            Subject: {
              Data: `${typeEmoji} ${title} — Rigid Residential`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            },
          },
        }));
        sent++;
      } catch (err: any) {
        failed++;
        errors.push(`${resident.email}: ${err.message}`);
        console.error(`Failed to email ${resident.email}:`, err.message);
      }
    }

    return response(200, {
      message: `Emails sent: ${sent}, failed: ${failed}`,
      sent,
      failed,
      total: residents.length,
    });

  } catch (error: any) {
    console.error('Error sending announcement emails:', error);
    return response(500, { message: 'Failed to send announcement emails' });
  }
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function response(statusCode: number, body: object) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    body: JSON.stringify(body),
  };
}
