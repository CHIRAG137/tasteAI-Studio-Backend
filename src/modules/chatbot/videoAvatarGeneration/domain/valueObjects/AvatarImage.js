'use strict';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

class AvatarImage {
  constructor({ buffer, mimeType }) {
    if (!buffer) {
      throw new Error('Image buffer is required');
    }

    if (!mimeType) {
      throw new Error('Image mime type is required');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    this.buffer = buffer;
    this.mimeType = mimeType;
  }
}

module.exports = AvatarImage;
