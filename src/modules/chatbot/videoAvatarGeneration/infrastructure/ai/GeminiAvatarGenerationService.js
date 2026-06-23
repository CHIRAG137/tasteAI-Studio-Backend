'use strict';

const IAvatarGenerationService = require('../../domain/services/IAvatarGenerationService');

class GeminiAvatarGenerationService extends IAvatarGenerationService {
  constructor(geminiClient) {
    super();
    this.geminiClient = geminiClient;
  }

  async generateAvatar({ imageBuffer, mimeType, prompt }) {
    const model = this.geminiClient.getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });

    const response = await model.generateContent([
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
      {
        text: prompt,
      },
    ]);

    const imagePart = response.response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData,
    );

    if (!imagePart) {
      throw new Error('No image returned from Gemini');
    }

    return {
      videoBotImageBase64: imagePart.inlineData.data,

      videoBotImageMimeType: imagePart.inlineData.mimeType || 'image/png',
    };
  }
}

module.exports = GeminiAvatarGenerationService;
