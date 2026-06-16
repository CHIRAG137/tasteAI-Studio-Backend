const cloudinary = require('../config/cloudinaryClient');
const streamifier = require('streamifier');
const logger = require('../utils/logger');
const genAIClient = require('../config/genAIClient');

// uploads a buffer to Cloudinary
exports.uploadBufferToCloudinary = (buffer, folder = 'video-bots') => {
  logger.info('Uploading buffer to Cloudinary', { folder, size: buffer.length });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', { error: error.message });
          return reject(error);
        }
        logger.info('Cloudinary upload successful', { public_id: result.public_id });
        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// generates an image using Google Gemini
exports.generateImage = async (imageBuffer, mimeType, prompt) => {
  try {
    if (!imageBuffer || !prompt) {
      const msg = 'Image buffer or prompt missing';
      logger.warn(msg, { bufferLength: imageBuffer?.length, prompt });
      throw new Error(msg);
    }

    logger.info('Generating image via Gemini', { prompt, mimeType });

    const model = genAIClient.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const imageBase64 = imageBuffer.toString('base64');

    const response = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
      {
        text: prompt,
      },
    ]);

    logger.info('Gemini image generation successful', { prompt });

    return response.response;
  } catch (error) {
    logger.error('Gemini image generation failed', { error: error.message, prompt });
    throw error;
  }
};
