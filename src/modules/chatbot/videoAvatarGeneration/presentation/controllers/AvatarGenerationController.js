'use strict';

const ApiResponse = require('../../../../shared/response/ApiResponse');

class AvatarGenerationController {
  constructor({ avatarGenerationFacade }) {
    this._facade = avatarGenerationFacade;
    this.generateAvatar = this.generateAvatar.bind(this);
    this.uploadCroppedImage = this.uploadCroppedImage.bind(this);
  }

  async generateAvatar(req, res) {
    const result = await this._facade.generateAvatar({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      prompt: req.body.prompt,
    });
    return ApiResponse.success(res, result, 'Avatar generated successfully');
  }

  async uploadCroppedImage(req, res) {
    const result = await this._facade.uploadCroppedImage({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    return ApiResponse.success(res, result, 'Avatar uploaded successfully');
  }
}

module.exports = AvatarGenerationController;
