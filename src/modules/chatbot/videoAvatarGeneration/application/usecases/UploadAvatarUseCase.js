'use strict';

const Avatar = require('../../domain/entities/Avatar');

const AvatarImage = require('../../domain/valueObjects/AvatarImage');

class UploadAvatarUseCase {
  constructor({ avatarStorageService, avatarRepository }) {
    this.avatarStorageService = avatarStorageService;

    this.avatarRepository = avatarRepository;
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

    const avatar = Avatar.create({
      imageUrl: uploaded.secure_url,

      publicId: uploaded.public_id,
    });

    await this.avatarRepository.save(avatar);

    return avatar;
  }
}

module.exports = UploadAvatarUseCase;
