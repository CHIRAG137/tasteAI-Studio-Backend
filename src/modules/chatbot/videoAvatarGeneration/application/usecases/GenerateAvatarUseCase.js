'use strict';

const AvatarPrompt = require('../../domain/valueObjects/AvatarPrompt');

const AvatarImage = require('../../domain/valueObjects/AvatarImage');

class GenerateAvatarUseCase {
  constructor({ avatarGenerationService }) {
    this.avatarGenerationService = avatarGenerationService;
  }

  async execute({ imageBuffer, mimeType, prompt }) {
    const avatarPrompt = new AvatarPrompt(prompt);

    const avatarImage = new AvatarImage({
      buffer: imageBuffer,
      mimeType,
    });

    return this.avatarGenerationService.generateAvatar({
      imageBuffer: avatarImage.buffer,

      mimeType: avatarImage.mimeType,

      prompt: avatarPrompt.value,
    });
  }
}

module.exports = GenerateAvatarUseCase;
