const axios = require("axios");
const SlackIntegration = require("../models/SlackIntegration");
const ChatBot = require("../models/ChatBot");
const QAHistory = require("../models/QAHistory");
const { extractTextFromPDF } = require("../utils/textExtractor");
const { generateQAsViaGPT, getEmbedding } = require("../utils/gptUtils");
const { embedText, cosineSimilarity } = require("../utils/embedUtils");
const logger = require("../utils/logger");

exports.createBot = async (req) => {
  const {
    name,
    website_url,
    description,
    is_voice_enabled,
    is_auto_translate,
    supported_languages,
    primary_purpose,
    specialisation_area,
    conversation_tone,
    response_style,
    target_audience,
    key_topics,
    keywords,
    custom_instructions,
    is_slack_enabled,
    slack_command,
    slack_channel_id,
    conversationFlow,
  } = req.body;

  if (!name || !description) {
    logger.error("Bot creation failed - missing required fields", { name, description });
    throw new Error("Missing required fields: name, or description");
  }

  // Parse supported_languages
  let parsedLanguages;
  try {
    parsedLanguages = JSON.parse(supported_languages);
    if (!Array.isArray(parsedLanguages)) throw new Error("Not an array");
  } catch {
    parsedLanguages = supported_languages ?.split(",").map((lang) => lang.trim());
  }

  // Parse conversation flow
  let parsedConversationFlow = conversationFlow;
  if (typeof conversationFlow === "string") {
    try {
      parsedConversationFlow = JSON.parse(conversationFlow);
    } catch {
      parsedConversationFlow = { nodes: [], edges: [] };
    }
  }

  // Create bot
  const bot = await ChatBot.create({
    user: req.user.id,
    name,
    website_url,
    description,
    is_voice_enabled: is_voice_enabled === "true",
    is_auto_translate: is_auto_translate === "true",
    is_slack_enabled: is_slack_enabled === "true",
    slack_command,
    slack_channel_id,
    supported_languages: parsedLanguages,
    primary_purpose,
    specialisation_area,
    conversation_tone,
    response_style,
    target_audience,
    key_topics,
    keywords,
    custom_instructions,
    conversationFlow: parsedConversationFlow,
  });

  logger.info("Bot created", { botId: bot._id, userId: req.user.id, name });

  // Scraping website log
  if (website_url) {
    logger.info("Scraping website for bot", { website_url, botId: bot._id });
  }

  // Slack auto-join
  if (is_slack_enabled === "true" && slack_channel_id) {
    const slackIntegration = await SlackIntegration.findOne({ userId: req.user.id });

    if (slackIntegration?.slackAccessToken) {
      try {
        await axios.post(
          "https://slack.com/api/conversations.join",
          { channel: slack_channel_id },
          {
            headers: {
              Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        logger.info("Bot joined Slack channel", { botId: bot._id, slack_channel_id });
      } catch (err) {
        logger.error("Error joining Slack channel", { botId: bot._id, slack_channel_id, error: err.response?.data || err.message });
      }
    } else {
      logger.warn("Slack integration not found, bot not added to channel", { botId: bot._id, userId: req.user.id });
    }
  }

  // Process uploaded PDF
  if (req.file) {
    logger.info("Processing uploaded PDF for bot", { botId: bot._id, file: req.file.originalname });

    const text = await extractTextFromPDF(req.file.path);
    if (text && text.trim()) {
      const chunks = text.match(/.{1,3000}/g);
      for (const chunk of chunks) {
        const qas = await generateQAsViaGPT(chunk, name, description);
        for (const qa of qas) {
          const { question, answer } = qa;
          if (question && answer) {
            const embedding = await embedText(question);
            await QAHistory.create({
              bot: bot._id,
              question,
              answer,
              embedding: Buffer.from(embedding.buffer),
            });
            logger.debug("QA added from PDF chunk", { botId: bot._id, question });
          }
        }
      }
    }
  }

  return { bot_id: bot._id, message: "Bot created successfully with GPT-generated QAs and added to Slack channel (if enabled)." };
};

exports.askBot = async (question, botId) => {
  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.error("Bot not found", { botId });
    throw new Error("Bot not found");
  }

  logger.info("Bot asked a question", { botId, question });

  const inputEmbedding = await getEmbedding(question);
  const qas = await QAHistory.find({ bot: botId });

  let bestMatch = null,
    bestScore = -1;
  for (let qa of qas) {
    const storedEmbedding = new Float32Array(qa.embedding.buffer);
    const score = cosineSimilarity(inputEmbedding, storedEmbedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  if (bestScore > 0.85 && bestMatch) {
    await QAHistory.create({
      bot: botId,
      question,
      answer: bestMatch.answer,
      embedding: Buffer.from(inputEmbedding.buffer),
    });

    logger.info("Best QA match found", { botId, score: bestScore, question });

    return { answer: bestMatch.answer, score: bestScore, source: "qa" };
  }

  logger.warn("No strong QA match found", { botId, score: bestScore, question });
  return { message: "No match found.", score: bestScore };
};
