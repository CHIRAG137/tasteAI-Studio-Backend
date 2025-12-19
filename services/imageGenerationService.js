const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('../config/cloudinaryClient');
const streamifier = require('streamifier');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.uploadBufferToCloudinary = (buffer, folder = 'video-bots') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

exports.generateImage = async (imageBuffer, mimeType, prompt) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-image',
  });

  const imageBase64 = imageBuffer.toString('base64');

  const response = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
    {
      text: prompt,
    },
  ]);

  return response.response;
};
