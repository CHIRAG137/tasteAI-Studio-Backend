'use strict';

const streamifier = require('streamifier');
const AvatarProviderTypes = require('./AvatarProviderTypes');
const logger = require('../../../../shared/logging');

class CloudinaryAvatarProvider {
  constructor(cloudinaryClient) {
    this._client = cloudinaryClient;
  }

  getType() {
    return AvatarProviderTypes.CLOUDINARY;
  }

  uploadImage(buffer, folder) {
    logger.info('Uploading image to Cloudinary', { folder });

    return new Promise((resolve, reject) => {
      const stream = this._client.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed', { error: error.message });
            return reject(error);
          }
          logger.info('Image uploaded to Cloudinary', { publicId: result.public_id });
          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(stream);
    });
  }
}

module.exports = CloudinaryAvatarProvider;
