const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/s3');
const { v4: uuidv4 } = require('crypto');

/**
 * Generates a presigned URL for direct-to-S3 upload.
 * @param {string} fileType - MIME type (e.g. 'image/jpeg')
 * @returns {{ uploadUrl: string, fileUrl: string }}
 */
const generatePresignedUploadUrl = async (fileType) => {
  const ext = fileType.split('/')[1] || 'jpg';
  const key = `products/${generateUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

  const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl };
};

/**
 * Simple UUID generator using Node crypto
 */
function generateUUID() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

module.exports = { generatePresignedUploadUrl };
