const express = require('express');

const router = express.Router();
const imageGenerationController = require('../controllers/imageGenerationController');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * @route   POST /api/human/generate-image
 * @desc    Generate a video bot avatar from an uploaded image and prompt using AI
 * @access  Private (Authenticated user)
 */
router.post(
  '/generate-image',
  upload.single('video_bot_image'),
  imageGenerationController.generateImage,
);

/**
 * @route   POST /api/human/upload-cropped-image
 * @desc    Upload a cropped video bot avatar to Cloudinary
 * @access  Private (Authenticated user)
 */
router.post(
  '/upload-cropped-image',
  upload.single('video_bot_image'),
  imageGenerationController.uploadCroppedImage,
);

module.exports = router;
