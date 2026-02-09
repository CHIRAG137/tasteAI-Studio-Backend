const genAIClient = require('../config/genAIClient');
const logger = require('../utils/logger');

exports.summarizeConversationWithGemini = async (messages, botName) => {
  try {
    logger.info('Initializing Gemini summarization', {
      botName,
      messageCount: messages.length,
    });

    const model = genAIClient.getGenerativeModel({
      model: 'gemini-3-pro-preview',
    });

    const conversationText = messages
      .map(
        (msg) =>
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      )
      .join('\n\n');

    logger.debug('Gemini summarization prompt prepared', {
      botName,
      conversationLength: conversationText.length,
    });

    const prompt = `
You are an AI summarizer. Summarize the following conversation between a user and a chatbot named ${botName}.
Provide a clear, concise summary highlighting key points, decisions, and tone.
Format it in 4 bullet points keeping bullet points concise and short.

Conversation:
${conversationText}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    logger.info('Gemini summarization successful', {
      botName,
      summaryLength: text?.length || 0,
    });

    return text;
  } catch (error) {
    logger.error('Gemini summarization failed', {
      botName,
      error: error.message,
      stack: error.stack,
    });

    throw new Error('Failed to summarize conversation using Gemini.');
  }
};
