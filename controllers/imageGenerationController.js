const geminiImageService = require('../services/imageGenerationService');

exports.generateImage = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'Image is required' });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: 'Prompt is required' });
    }

    const result = await geminiImageService.generateImage(
      req.file.buffer,
      req.file.mimetype,
      prompt
    );

    return res.status(200).json({
      success: true,
      data: result,
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
