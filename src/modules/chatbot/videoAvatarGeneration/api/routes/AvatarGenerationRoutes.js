'use strict';

const express = require('express');

function createAvatarGenerationRoutes({ avatarGenerationController, authGuard, uploadMiddleware }) {
  const router = express.Router();

  if (authGuard) {
    router.use(authGuard);
  }

  router.post(
    '/generate-image',
    uploadMiddleware.single('video_bot_image'),
    avatarGenerationController.generateAvatar.bind(avatarGenerationController),
  );

  router.post(
    '/upload-cropped-image',
    uploadMiddleware.single('video_bot_image'),
    avatarGenerationController.uploadAvatar.bind(avatarGenerationController),
  );

  return router;
}

module.exports = {
  createAvatarGenerationRoutes,
};
