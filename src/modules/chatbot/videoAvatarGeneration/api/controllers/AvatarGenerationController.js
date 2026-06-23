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
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'video_bot_image is required',
        });
      }

      const result = await this.uploadAvatarUseCase.execute({
        imageBuffer: req.file.buffer,

        mimeType: req.file.mimetype,
      });

      return res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AvatarGenerationController;
