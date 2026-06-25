'use strict';

const express = require('express');
const asyncHandler = require('../../../../shared/middleware/asyncHandler');

function createAvatarGenerationRoutes({ avatarGenerationController, authGuard, uploadMiddleware }) {
  const router = express.Router();
  const guard = authGuard ?? ((req, res, next) => next());

  router.post(
    '/generate-image',
    guard,
    uploadMiddleware.single('video_bot_image'),
    asyncHandler(avatarGenerationController.generateAvatar),
  );

  router.post(
    '/upload-cropped-image',
    guard,
    uploadMiddleware.single('video_bot_image'),
    asyncHandler(avatarGenerationController.uploadCroppedImage),
  );

  return router;
}

module.exports = { createAvatarGenerationRoutes };
