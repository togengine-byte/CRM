import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import crypto from 'crypto';

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'idicrmai';

// Generate unique file key
function generateFileKey(originalName: string, folder: string = 'uploads'): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${folder}/${timestamp}-${randomString}-${baseName}${ext}`;
}

// Upload file to S3
export async function uploadToS3(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<{ key: string; url: string }> {
  const key = generateFileKey(originalName, folder);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    // Metadata for file info
    Metadata: {
      originalName: encodeURIComponent(originalName),
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // Return the key and a signed URL for immediate access
  const url = await getSignedDownloadUrl(key);

  return { key, url };
}

// Get signed URL for downloading/viewing a file
export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

// Get signed URL for uploading directly from client (presigned PUT)
export async function getSignedUploadUrl(
  originalName: string,
  mimeType: string,
  folder: string = 'uploads',
  expiresIn: number = 300
): Promise<{ key: string; uploadUrl: string }> {
  const key = generateFileKey(originalName, folder);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { key, uploadUrl };
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

// Check if file exists in S3
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

// Get file metadata from S3
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  contentLength: number;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    return {
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch (error) {
    return null;
  }
}

// Helper to determine folder based on file type/context
export function getS3Folder(context: 'quote' | 'work' | 'supplier' | 'customer' | 'general'): string {
  const folders: Record<string, string> = {
    quote: 'quotes',
    work: 'works',
    supplier: 'suppliers',
    customer: 'customers',
    general: 'uploads',
  };
  return folders[context] || 'uploads';
}

// Export the client for advanced usage
export { s3Client, BUCKET_NAME };
