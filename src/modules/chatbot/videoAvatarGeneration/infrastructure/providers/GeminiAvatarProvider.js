'use strict';

const AvatarProviderTypes = require('./AvatarProviderTypes');
const logger = require('../../../../shared/logging');

class GeminiAvatarProvider {
  constructor(geminiClient) {
    this._client = geminiClient;
  }

  getType() {
    return AvatarProviderTypes.GEMINI;
  }

  async generateAvatar({ imageBuffer, mimeType, prompt }) {
    logger.info('Generating avatar with Gemini', { prompt });

    const model = this._client.getGenerativeModel({
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

    logger.info('Avatar generated successfully');

    return {
      videoBotImageBase64: imagePart.inlineData.data,
      videoBotImageMimeType: imagePart.inlineData.mimeType || 'image/png',
    };
  }
}

module.exports = GeminiAvatarProvider;
