'use strict';

const IAvatarRepository = require('../../domain/repositories/IAvatarRepository');

class MongoAvatarRepository extends IAvatarRepository {
  constructor({ avatarModel }) {
    super();
    this.avatarModel = avatarModel;
  }

  async save(avatar) {
    return this.avatarModel.create({
      imageUrl: avatar.imageUrl,
      publicId: avatar.publicId,
    });
  }

  async findById(id) {
    return this.avatarModel.findById(id);
  }
}

module.exports = MongoAvatarRepository;
