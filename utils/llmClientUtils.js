const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const { decryptApiKey } = require('./encryptionUtils');
const logger = require('./logger');
const ChatBot = require('../models/ChatBot');
const UserApiKey = require('../models/UserApiKey');

/**
 * Get LLM client based on bot configuration or return default
 * Supports being called with bot object or fetching bot by ID
 */
exports.getLLMClient = async (botIdOrBot, userId = null) => {
  try {
    let bot;
    
    // Handle both bot object and botId string
    if (typeof botIdOrBot === 'string') {
      bot = await ChatBot.findById(botIdOrBot);
      if (!bot) {
        logger.warn('Bot not found, using default LLM', { botId: botIdOrBot });
        return createDefaultLLMInterface();
      }
    } else {
      bot = botIdOrBot;
    }

    // Check if bot has custom LLM configured (bot key or saved user key)
    if (bot.custom_llm_provider && (bot.encrypted_api_key || bot.custom_api_key_source === 'user')) {
      try {
        let decrypted = null;

        if (bot.custom_api_key_source === 'user') {
          const ownerId = bot.user?._id || bot.user;
          const keyDoc = await UserApiKey.findOne({
            user: ownerId,
            provider: bot.custom_llm_provider,
          }).lean();

          if (!keyDoc?.encrypted_api_key) {
            throw new Error('No saved API key found for bot owner');
          }

          decrypted = decryptApiKey(keyDoc.encrypted_api_key);
        } else {
          decrypted = decryptApiKey(bot.encrypted_api_key);
        }

        logger.debug('Using custom LLM for bot', {
          botId: bot._id,
          provider: bot.custom_llm_provider,
          keySource: bot.custom_api_key_source || 'bot',
        });

        if (bot.custom_llm_provider === 'openai') {
          return createOpenAIInterface(decrypted, bot.custom_model || 'gpt-4');
        } else if (bot.custom_llm_provider === 'gemini') {
          return createGeminiInterface(decrypted, bot.custom_model || 'gemini-3-pro-preview');
        }
      } catch (err) {
        logger.warn('Failed to decrypt custom API key, using default LLM', {
          botId: bot._id,
          error: err.message,
        });
        return createDefaultLLMInterface();
      }
    }

    // Use default backend LLM
    return createDefaultLLMInterface();
  } catch (error) {
    logger.error('Error creating LLM client', {
      error: error.message,
      botId: botIdOrBot?._id || botIdOrBot,
    });
    return createDefaultLLMInterface();
  }
};

/**
 * Create interface for default Gemini LLM
 */
function createDefaultLLMInterface() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-preview' });

  return {
    getEmbedding: async (text) => {
      const embeddingModel = genAI.getGenerativeModel({
        model: 'embedding-001',
      });
      const result = await embeddingModel.embedContent(text);
      return new Float32Array(result.embedding.values);
    },
    generateQAs: async (textChunk, botName, botDescription, personaContext = null) => {
      const systemPrompt = `
You are an AI assistant that helps generate valuable, context-aware Q&A pairs from user-provided documents.

The chatbot being built is named **${botName}**.
Its purpose/description is: **${botDescription}**.
${personaContext ? `Additional context about the bot's persona:\n${personaContext}` : ''}

Based on the chunk of document text provided, extract meaningful questions and answers that reflect the tone and intent of this bot.
Focus on generating **informative, helpful, and on-topic Q&A pairs** that align with the bot's purpose and persona.
Return only a list of 10–15 questions and answers in JSON format like this:

[
  { "question": "...", "answer": "..." },
  ...
]
`;

      const userPrompt = `Here is a chunk of the document:\n\n${textChunk}\n\nGenerate Q&A pairs now.`;
      const prompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const qas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return Array.isArray(qas) ? qas : [];
    },
    generateSummary: async (prompt) => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}

/**
 * Create interface for custom OpenAI LLM
 */
function createOpenAIInterface(apiKey, modelName = 'gpt-4') {
  const client = new OpenAI({ apiKey });

  return {
    getEmbedding: async (text) => {
      const result = await client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return new Float32Array(result.data[0].embedding);
    },
    generateQAs: async (textChunk, botName, botDescription, personaContext = null) => {
      const systemPrompt = `
You are an AI assistant that helps generate valuable, context-aware Q&A pairs from user-provided documents.

The chatbot being built is named **${botName}**.
Its purpose/description is: **${botDescription}**.
${personaContext ? `Additional context about the bot's persona:\n${personaContext}` : ''}

Based on the chunk of document text provided, extract meaningful questions and answers that reflect the tone and intent of this bot.
Focus on generating **informative, helpful, and on-topic Q&A pairs** that align with the bot's purpose and persona.
Return only a list of 10–15 questions and answers in JSON format like this:

[
  { "question": "...", "answer": "..." },
  ...
]
`;

      const userPrompt = `Here is a chunk of the document:\n\n${textChunk}\n\nGenerate Q&A pairs now.`;

      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });

      const responseText = completion.choices[0].message.content;
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const qas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return Array.isArray(qas) ? qas : [];
    },
    generateSummary: async (prompt) => {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      return completion.choices[0].message.content;
    },
  };
}

/**
 * Create interface for custom Gemini LLM
 */
function createGeminiInterface(apiKey, modelName = 'gemini-3-pro-preview') {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const embeddingModel = genAI.getGenerativeModel({
    model: 'embedding-001',
  });

  return {
    getEmbedding: async (text) => {
      const result = await embeddingModel.embedContent(text);
      return new Float32Array(result.embedding.values);
    },
    generateQAs: async (textChunk, botName, botDescription, personaContext = null) => {
      const systemPrompt = `
You are an AI assistant that helps generate valuable, context-aware Q&A pairs from user-provided documents.

The chatbot being built is named **${botName}**.
Its purpose/description is: **${botDescription}**.
${personaContext ? `Additional context about the bot's persona:\n${personaContext}` : ''}

Based on the chunk of document text provided, extract meaningful questions and answers that reflect the tone and intent of this bot.
Focus on generating **informative, helpful, and on-topic Q&A pairs** that align with the bot's purpose and persona.
Return only a list of 10–15 questions and answers in JSON format like this:

[
  { "question": "...", "answer": "..." },
  ...
]
`;

      const userPrompt = `Here is a chunk of the document:\n\n${textChunk}\n\nGenerate Q&A pairs now.`;
      const prompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const qas = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return Array.isArray(qas) ? qas : [];
    },
    generateSummary: async (prompt) => {
      const result = await model.generateContent(prompt);
      return result.response.text();
    },
  };
}

/**
 * Generate embedding using appropriate LLM (custom or default)
 */
exports.generateEmbedding = async (text, botIdOrBot, userId = null) => {
  try {
    const llmClient = await exports.getLLMClient(botIdOrBot, userId);
    return await llmClient.getEmbedding(text);
  } catch (error) {
    logger.error('Error generating embedding', {
      error: error.message,
      botId: botIdOrBot?._id || botIdOrBot,
    });
    throw error;
  }
};

/**
 * Generate Q&A pairs using appropriate LLM (custom or default)
 */
exports.generateQAsWithLLM = async (textChunk, botName, botDescription, botIdOrBot, userId = null, personaContext = null) => {
  try {
    const llmClient = await exports.getLLMClient(botIdOrBot, userId);
    return await llmClient.generateQAs(textChunk, botName, botDescription, personaContext);
  } catch (error) {
    logger.error('Error generating Q&As with LLM', {
      error: error.message,
      botId: botIdOrBot?._id || botIdOrBot,
    });
    throw error;
  }
};

exports.testCustomLLMConnection = async (provider, apiKey, model = null) => {
  const normalizedProvider = typeof provider === 'string' ? provider.toLowerCase() : null;
  if (!normalizedProvider || !['openai', 'gemini'].includes(normalizedProvider)) {
    throw new Error('Invalid custom LLM provider. Must be openai or gemini.');
  }

  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API key is required for custom LLM validation.');
  }

  const testModel = model || (normalizedProvider === 'openai' ? 'gpt-4' : 'gemini-3-pro-preview');
  const prompt = 'Please respond with the single word OK to validate your API key.';

  if (normalizedProvider === 'openai') {
    const llmClient = createOpenAIInterface(apiKey, testModel);
    const response = await llmClient.generateSummary(prompt);
    if (!response || !response.toLowerCase().includes('ok')) {
      throw new Error('Unable to validate OpenAI key and model combination.');
    }
    return true;
  }

  const llmClient = createGeminiInterface(apiKey, testModel);
  const response = await llmClient.generateSummary(prompt);
  if (!response || !response.toLowerCase().includes('ok')) {
    throw new Error('Unable to validate Gemini key and model combination.');
  }
  return true;
};

module.exports = exports;
