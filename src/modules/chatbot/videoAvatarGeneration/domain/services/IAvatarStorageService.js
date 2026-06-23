'use strict';

class IAvatarStorageService {
  async uploadImage(buffer, folder) {
    throw new Error('IAvatarStorageService.uploadImage() must be implemented');
  }
}

module.exports = IAvatarStorageService;
