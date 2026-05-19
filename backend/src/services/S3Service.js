const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

class S3Service {
  static async getPresignedUrl(fileName) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName
      });
      
      // Using getSignedUrl from AWS SDK v3 requires @aws-sdk/s3-request-presigner
      // For now, we'll return a direct S3 URL (note: only works if file is public)
      const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      return url;
    } catch (error) {
      console.error('Error getting S3 URL:', error);
      throw error;
    }
  }

  static async uploadFile(fileName, fileBuffer) {
    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer
      });
      
      const response = await s3Client.send(command);
      return response;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  static async fileExists(fileName) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName
      });
      
      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      console.error('Error checking file in S3:', error);
      throw error;
    }
  }
}

module.exports = S3Service;
