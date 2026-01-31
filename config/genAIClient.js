const { GoogleGenerativeAI } = require('@google/generative-ai');
const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
module.exports = client;
