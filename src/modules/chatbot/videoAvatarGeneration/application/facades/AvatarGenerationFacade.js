'use strict';

class AvatarGenerationFacade {
  constructor({ avatarProvider, storageProvider }) {
    this._avatarProvider = avatarProvider;
    this._storageProvider = storageProvider;
  }

  async generateAvatar({ imageBuffer, mimeType, prompt }) {
    return this._avatarProvider.generateAvatar({ imageBuffer, mimeType, prompt });
  }

  async uploadCroppedImage({ imageBuffer, mimeType }) {
    const uploaded = await this._storageProvider.uploadImage(imageBuffer, 'video-bot-avatars');
    return {
      videoBotImageUrl: uploaded.secure_url,
      videoBotImagePublicId: uploaded.public_id,
    };
  }
}

module.exports = AvatarGenerationFacade;
