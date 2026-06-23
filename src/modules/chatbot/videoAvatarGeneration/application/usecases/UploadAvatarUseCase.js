'use strict';

const AvatarImage = require('../../domain/valueObjects/AvatarImage');

class UploadAvatarUseCase {
  constructor({ avatarStorageService }) {
    this.avatarStorageService = avatarStorageService;
  }

  async execute({ imageBuffer, mimeType }) {
    const avatarImage = new AvatarImage({
      buffer: imageBuffer,
      mimeType,
    });

    const uploaded = await this.avatarStorageService.uploadImage(
      avatarImage.buffer,
      'video-bot-avatars',
    );

    return {
      videoBotImageUrl: uploaded.secure_url,

      videoBotImagePublicId: uploaded.public_id,
    };
  }
}

module.exports = UploadAvatarUseCase;
