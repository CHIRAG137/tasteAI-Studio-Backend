'use strict';

const cloudinary = require('cloudinary').v2;
const logger = require('../../../../shared/logging');

function createCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      '[videoAvatarGeneration] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required',
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  logger.info('Cloudinary client configured');

  return cloudinary;
}

module.exports = { createCloudinaryClient };
