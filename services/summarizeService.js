const genAIClient = require('../config/genAIClient');
const { getLLMClient } = require('../utils/llmClientUtils');
const logger = require('../utils/logger');

exports.summarizeConversationWithGemini = async (
  messages,
  botName,
  botId = null,
  userId = null,
) => {
  try {
    logger.info('Initializing conversation summarization', {
      botName,
      messageCount: messages.length,
      botId,
      usingCustomLLM: !!botId,
    });

    const conversationText = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    logger.debug('Summarization prompt prepared', {
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

    let text;

    // Use custom LLM if botId is provided and bot has custom LLM configured
    if (botId) {
      try {
        const { generateSummary } = await getLLMClient(botId, userId);
        text = await generateSummary(prompt);
      } catch (error) {
        logger.error('Error summarizing with custom LLM, falling back to default Gemini', {
          botId,
          error: error.message,
        });
        // Fallback to default Gemini
        const model = genAIClient.getGenerativeModel({
          model: 'gemini-3.1-pro-preview',
        });
        const result = await model.generateContent(prompt);
        text = result.response.text();
      }
    } else {
      // Use default Gemini
      const model = genAIClient.getGenerativeModel({
        model: 'gemini-3.1-pro-preview',
      });
      const result = await model.generateContent(prompt);
      text = result.response.text();
    }

    logger.info('Conversation summarization successful', {
      botName,
      summaryLength: text?.length || 0,
    });

    return text;
  } catch (error) {
    logger.error('Conversation summarization failed', {
      botName,
      botId,
      error: error.message,
      stack: error.stack,
    });

    throw new Error('Failed to summarize conversation.');
  }
};
