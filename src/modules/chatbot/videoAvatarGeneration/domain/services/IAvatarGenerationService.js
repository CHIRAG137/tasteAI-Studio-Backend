'use strict';

class IAvatarGenerationService {
  async generateAvatar({ imageBuffer, mimeType, prompt }) {
    throw new Error('IAvatarGenerationService.generateAvatar() must be implemented');
  }
}

module.exports = IAvatarGenerationService;
