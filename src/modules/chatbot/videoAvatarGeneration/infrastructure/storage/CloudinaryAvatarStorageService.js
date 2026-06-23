'use strict';

const streamifier = require('streamifier');

const IAvatarStorageService = require('../../domain/services/IAvatarStorageService');

class CloudinaryAvatarStorageService extends IAvatarStorageService {
  constructor(cloudinaryClient) {
    super();
    this.cloudinaryClient = cloudinaryClient;
  }

  uploadImage(buffer, folder) {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result);
        },
      );

      streamifier.createReadStream(buffer).pipe(stream);
    });
  }
}

module.exports = CloudinaryAvatarStorageService;
