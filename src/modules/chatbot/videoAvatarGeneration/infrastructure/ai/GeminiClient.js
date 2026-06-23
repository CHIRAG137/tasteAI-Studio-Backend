'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');

function createGeminiClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

module.exports = {
  createGeminiClient,
};
