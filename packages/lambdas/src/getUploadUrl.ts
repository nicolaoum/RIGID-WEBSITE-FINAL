import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});

/**
 * POST /upload-url
 * Generates a presigned URL for uploading images to S3
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('POST /upload-url request:', event);

  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({ error: 'fileName and contentType are required' }),
      };
    }

    const key = `units/${randomUUID()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.IMAGES_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${process.env.IMAGES_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    console.log('Generated URLs:', { uploadUrl, fileUrl });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ uploadUrl, fileUrl, key }),
    };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ error: 'Failed to generate upload URL' }),
    };
  }
};
