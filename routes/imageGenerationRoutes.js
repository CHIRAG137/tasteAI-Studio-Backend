const express = require('express');
const router = express.Router();
const geminiImageController = require('../controllers/imageGenerationController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post(
  '/generate-image',
  upload.single('video_bot_image'),
  geminiImageController.generateImage
);

router.post(
  '/upload-cropped-image',
  upload.single('video_bot_image'),
  geminiImageController.uploadCroppedImage
);

module.exports = router;