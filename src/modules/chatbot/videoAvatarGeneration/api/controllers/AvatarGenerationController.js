'use strict';

class AvatarGenerationController {
  constructor({ generateAvatarUseCase, uploadAvatarUseCase }) {
    this.generateAvatarUseCase = generateAvatarUseCase;

    this.uploadAvatarUseCase = uploadAvatarUseCase;
  }

  async generateAvatar(req, res, next) {
    try {
      const result = await this.generateAvatarUseCase.execute({
        imageBuffer: req.file.buffer,

        mimeType: req.file.mimetype,

        prompt: req.body.prompt,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
      const avatar = await this.uploadAvatarUseCase.execute({
        imageBuffer: req.file.buffer,
      });

      return res.json({
        success: true,
        data: avatar,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AvatarGenerationController;
