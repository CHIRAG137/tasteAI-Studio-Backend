const geminiImageService = require('../services/imageGenerationService');

exports.generateImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required',
      });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
    }

    const geminiResponse = await geminiImageService.generateImage(
      req.file.buffer,
      req.file.mimetype,
      prompt
    );

    const imagePart =
      geminiResponse.candidates?.[0]?.content?.parts?.find(
        part => part.inlineData
      );

    if (!imagePart) {
      throw new Error('No image returned from Gemini');
    }

    const generatedImageBuffer = Buffer.from(
      imagePart.inlineData.data,
      'base64'
    );

    const cloudinaryResult = await geminiImageService.uploadBufferToCloudinary(
      generatedImageBuffer,
      'video-bot-avatars'
    );

    return res.status(200).json({
      success: true,
      video_bot_image_url: cloudinaryResult.secure_url,
      video_bot_image_public_id: cloudinaryResult.public_id,
    });
  } catch (error) {
    console.error('Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Image generation failed',
      error: error.message,
    });
  }
};
