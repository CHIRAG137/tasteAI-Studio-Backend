const axios = require("axios");
const SlackIntegration = require("../models/SlackIntegration");
const ChatBot = require("../models/ChatBot");
const QAHistory = require("../models/QAHistory");
const Customization = require("../models/Customisation");
const { extractTextFromPDF } = require("../utils/textExtractor");
const { generateQAsViaGPT, getEmbedding } = require("../utils/gptUtils");
const { embedText, cosineSimilarity } = require("../utils/embedUtils");
const logger = require("../utils/logger");
const FlowSession = require("../models/FlowSession");

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

exports.getAllChatBots = async (userId) => {
  logger.info("Fetching all chat bots for user", { userId });
  const bots = await ChatBot.find({ user: userId });
  logger.info("Fetched chat bots", { userId, count: bots.length });
  return bots;
};

exports.getBotById = async (botId) => {
  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn("Bot not found", { botId });
    throw new Error("Bot not found");
  }
  logger.info("Fetched bot by ID", { botId });
  return bot;
};

exports.deleteBot = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    logger.warn("Bot not found for deletion", { botId, userId });
    throw new Error("Bot not found");
  }

  await Customization.findOneAndDelete({ botId });
  await QAHistory.deleteMany({ bot: botId });
  await ChatBot.findByIdAndDelete(botId);

  logger.info("Bot and associated data deleted", { botId, userId });
};

exports.updateBot = async (botId, userId, body, file) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    logger.warn("Bot not found for update", { botId, userId });
    throw new Error("Bot not found");
  }

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
  } = body;

  if (!name || !description) {
    logger.error("Missing required fields for bot update", { botId, userId, name, description });
    throw new Error("Missing required fields: name or description");
  }

  // Parse supported languages
  let parsedLanguages;
  try {
    parsedLanguages = JSON.parse(supported_languages);
    if (!Array.isArray(parsedLanguages)) throw new Error("Not an array");
  } catch {
    parsedLanguages = supported_languages?.split(",").map((lang) => lang.trim());
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

  // Update bot fields
  Object.assign(bot, {
    name: name || bot.name,
    website_url: website_url || bot.website_url,
    description: description || bot.description,
    is_voice_enabled: is_voice_enabled === "true",
    is_auto_translate: is_auto_translate === "true",
    is_slack_enabled: is_slack_enabled === "true",
    slack_command: slack_command || bot.slack_command,
    slack_channel_id: slack_channel_id || bot.slack_channel_id,
    supported_languages: parsedLanguages || bot.supported_languages,
    primary_purpose: primary_purpose || bot.primary_purpose,
    specialisation_area: specialisation_area || bot.specialisation_area,
    conversation_tone: conversation_tone || bot.conversation_tone,
    response_style: response_style || bot.response_style,
    target_audience: target_audience || bot.target_audience,
    key_topics: key_topics || bot.key_topics,
    keywords: keywords || bot.keywords,
    custom_instructions: custom_instructions || bot.custom_instructions,
    conversationFlow: parsedConversationFlow || bot.conversationFlow,
  });

  logger.info("Bot fields updated locally", { botId, userId });

  // Slack auto-join
  if (is_slack_enabled === "true" && slack_channel_id) {
    const slackIntegration = await SlackIntegration.findOne({ userId });
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
        logger.info("Bot joined Slack channel", { botId, slack_channel_id });
      } catch (err) {
        logger.error("Error joining Slack channel", {
          botId,
          slack_channel_id,
          error: err.response?.data || err.message,
        });
      }
    } else {
      logger.warn("Slack integration not found, bot not added to channel", { botId, userId });
    }
  }

  // Process PDF if uploaded
  if (file) {
    await QAHistory.deleteMany({ bot: bot._id });
    logger.info("Deleted previous QAs before updating bot", { botId });

    const text = await extractTextFromPDF(file.path);
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
            logger.debug("QA added from PDF chunk", { botId, question });
          }
        }
      }
    }
  }

  await bot.save();
  logger.info("Bot updated and saved successfully", { botId, userId });

  return bot;
};

exports.getCustomization = async (botId) => {
  if (!botId) {
    logger.error("Get customization failed: Bot ID missing");
    throw new Error("Bot ID is required");
  }

  logger.info("Fetching customization", { botId });

  const customization = await Customization.findOne({ botId });

  if (customization) {
    logger.info("Customization fetched successfully", { botId });
  } else {
    logger.warn("No customization found", { botId });
  }

  return customization;
};

exports.saveCustomization = async (botId, data) => {
  if (!botId) {
    logger.error("Save customization failed: Bot ID missing");
    throw new Error("Bot ID is required");
  }

  logger.info("Saving customization", { botId, data });

  const customization = await Customization.findOneAndUpdate(
    { botId },
    { ...data, botId },
    { new: true, upsert: true }
  );

  logger.info("Customization saved successfully", { botId });
  return customization;
};

exports.getAllChatHistories = async(botId) => {
  logger.info("Service: Retrieving all chat histories", { botId });

  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn("Bot not found while fetching histories", { botId });
    throw new Error("Bot not found");
  }

  const sessions = await FlowSession.find({ bot: botId }).sort({ createdAt: -1 });

  logger.info("Service: Successfully retrieved chat histories", { botId, totalSessions: sessions.length });

  return { botId, totalSessions: sessions.length, sessions };
};

exports.getChatHistoryBySession = async (botId, sessionId) => {
  logger.info("Service: Retrieving specific chat history", { botId, sessionId });

  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn("Bot not found while fetching specific history", { botId, sessionId });
    throw new Error("Bot not found");
  }

  const session = await FlowSession.findOne({ _id: sessionId, bot: botId });
  if (!session) {
    logger.warn("Chat session not found", { botId, sessionId });
    throw new Error("Chat history not found");
  }

  const history = session.history || [];

  // ✅ Filter out unwanted "extra" entries:
  // - type = question/confirmation
  // - content is object (not string)
  // - immediately follows a user_input of the same node
  const cleanedHistory = history.filter((entry, index) => {
    const prev = history[index - 1];

    const isExtra =
      (entry.type === "question" || entry.type === "confirmation") &&
      typeof entry.content === "object" &&
      prev?.type === "user_input" &&
      prev?.nodeId === entry.nodeId;

    return !isExtra;
  });

  logger.info("Service: Successfully retrieved and cleaned chat history", {
    botId,
    sessionId,
    originalLength: history.length,
    cleanedLength: cleanedHistory.length,
  });

  return {
    botId,
    sessionId,
    history: cleanedHistory,
    currentNodeId: session.currentNodeId,
    isFinished: session.isFinished,
    createdAt: session.createdAt,
    lastUpdatedAt: session.lastUpdatedAt,
  };
};
