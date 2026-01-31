const imageGenerationService = require('../services/imageGenerationService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// generate image based on prompt
exports.generateImage = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Image generation failed: No file uploaded', { body: req.body });
      return responseBuilder.badRequest(res, null, 'Image is required');
    }

    const { prompt } = req.body;
    if (!prompt) {
      logger.warn('Image generation failed: Prompt missing', { body: req.body });
      return responseBuilder.badRequest(res, null, 'Prompt is required');
    }

    logger.info('Generating image via Gemini', { prompt });

    const geminiResponse = await imageGenerationService.generateImage(
      req.file.buffer,
      req.file.mimetype,
      prompt
    );

    const imagePart =
      geminiResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (!imagePart) {
      logger.error('No image returned from Gemini', { prompt, geminiResponse });
      return responseBuilder.internalError(res, null, 'No image returned from Gemini');
    }

    const generatedImageBase64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    logger.info('Image generated successfully', { prompt });

    return responseBuilder.ok(res, {
      video_bot_image_base64: generatedImageBase64,
      video_bot_image_mime_type: mimeType,
    }, 'Image generated successfully');

  } catch (error) {
    logger.error('Image generation failed', { error: error.message, body: req.body });
    return responseBuilder.internalError(res, null, 'Image generation failed');
  }
};

// upload the cropped image to cloudinary
exports.uploadCroppedImage = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Upload cropped image failed: No file uploaded', { body: req.body });
      return responseBuilder.badRequest(res, null, 'Cropped image is required');
    }

    logger.info('Uploading cropped image to Cloudinary', { filename: req.file.originalname });

    const cloudinaryResult = await imageGenerationService.uploadBufferToCloudinary(
      req.file.buffer,
      'video-bot-avatars'
    );

    logger.info('Cropped image uploaded successfully', { public_id: cloudinaryResult.public_id });

    return responseBuilder.ok(res, {
      video_bot_image_url: cloudinaryResult.secure_url,
      video_bot_image_public_id: cloudinaryResult.public_id,
    }, 'Cropped image uploaded successfully');

  } catch (error) {
    logger.error('Failed to upload cropped image', { error: error.message });
    return responseBuilder.internalError(res, null, 'Failed to upload cropped image');
  }
};
