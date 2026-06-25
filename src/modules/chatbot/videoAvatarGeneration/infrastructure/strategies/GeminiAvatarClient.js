'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { env } = require('../../../../../config/env');

function createGeminiAvatarClient() {
  if (!env.GEMINI_API_KEY) {
    throw new Error('[videoAvatarGeneration] GEMINI_API_KEY is required');
  }

  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

module.exports = { createGeminiAvatarClient };
