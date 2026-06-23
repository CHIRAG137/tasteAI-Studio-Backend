'use strict';

class Avatar {
  constructor({ imageUrl, publicId, createdAt = new Date() }) {
    this.imageUrl = imageUrl;
    this.publicId = publicId;
    this.createdAt = createdAt;
  }

  static create({ imageUrl, publicId }) {
    return new Avatar({
      imageUrl,
      publicId,
      createdAt: new Date(),
    });
  }
}

module.exports = Avatar;
