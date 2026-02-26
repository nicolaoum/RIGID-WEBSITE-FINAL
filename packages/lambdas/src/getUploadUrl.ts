import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { corsHeaders } from './shared/cors';

const s3Client = new S3Client({});

/**
 * POST /upload-url
 * Generates a presigned URL for uploading images to S3
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const headers = corsHeaders(origin);

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'fileName and contentType are required' }),
      };
    }

    // Validate content type to prevent arbitrary file uploads
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only image files are allowed (jpeg, png, webp, gif)' }),
      };
    }

    const key = `units/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.IMAGES_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 min expiry
    const fileUrl = `https://${process.env.IMAGES_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadUrl, fileUrl, key }),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate upload URL' }),
    };
  }
};
