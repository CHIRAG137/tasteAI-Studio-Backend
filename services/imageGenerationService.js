const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
