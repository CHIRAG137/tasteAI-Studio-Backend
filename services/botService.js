const axios = require('axios');
const SlackIntegration = require('../models/SlackIntegration');
const ChatBot = require('../models/ChatBot');
const QAHistory = require('../models/QAHistory');
const Customization = require('../models/Customisation');
const { getEmbedding } = require('../utils/gptUtils');
const { cosineSimilarity } = require('../utils/embedUtils');
const logger = require('../utils/logger');
const FlowSession = require('../models/FlowSession');
const HumanAgentService = require('../services/humanAgentService');
const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const {
  processMarkdownContent,
  processPDFContent,
} = require('../utils/dataProcessingUtils');

// create chatbot
exports.createBot = async (req) => {
  const {
    name,
    website_url,
    description,
    is_voice_enabled,
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
    slack_channel_id,
    conversationFlow,
    scraped_content,
    scraped_urls,
    is_video_bot,
    video_bot_image_url,
    video_bot_image_public_id,
    voice_id,
    human_handoff_enabled,
    human_handoff_emails,
  } = req.body;

  if (!name || !description) {
    logger.error('Bot creation failed - missing required fields', {
      name,
      description,
    });
    throw new Error('Missing required fields: name, or description');
  }

  // Parse supported_languages
  let parsedLanguages;
  try {
    parsedLanguages = JSON.parse(supported_languages);
    if (!Array.isArray(parsedLanguages)) {
      throw new Error('Not an array');
    }
  } catch {
    parsedLanguages = supported_languages
      ?.split(',')
      .map((lang) => lang.trim());
  }

  // Parse conversation flow
  let parsedConversationFlow = conversationFlow;
  if (typeof conversationFlow === 'string') {
    try {
      parsedConversationFlow = JSON.parse(conversationFlow);
    } catch {
      parsedConversationFlow = { nodes: [], edges: [] };
    }
  }

  // Parse scraped content
  let parsedScrapedContent = [];
  if (scraped_content) {
    try {
      parsedScrapedContent =
        typeof scraped_content === 'string'
          ? JSON.parse(scraped_content)
          : scraped_content;

      if (!Array.isArray(parsedScrapedContent)) {
        parsedScrapedContent = [parsedScrapedContent];
      }
    } catch (err) {
      logger.warn('Failed to parse scraped_content', { error: err.message });
      parsedScrapedContent = [];
    }
  }

  // Parse scraped URLs
  let parsedScrapedUrls = [];
  if (scraped_urls) {
    try {
      parsedScrapedUrls = JSON.parse(scraped_urls);
      if (!Array.isArray(parsedScrapedUrls)) {
        parsedScrapedUrls = [scraped_urls];
      }
    } catch {
      parsedScrapedUrls = [scraped_urls];
    }
  }

  // human handoff emails
  let parsedHumanEmails = [];
  if (human_handoff_emails) {
    if (Array.isArray(human_handoff_emails)) {
      parsedHumanEmails = human_handoff_emails;
    } else if (typeof human_handoff_emails === 'string') {
      try {
        parsedHumanEmails = JSON.parse(human_handoff_emails);
      } catch {
        parsedHumanEmails = human_handoff_emails
          .split(',')
          .map((e) => e.trim());
      }
    }
  }

  // Create bot
  const bot = await ChatBot.create({
    user: req.user.id,
    name,
    website_url,
    description,
    is_voice_enabled: is_voice_enabled === 'true',
    is_slack_enabled: is_slack_enabled === 'true',
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
    scraped_urls: parsedScrapedUrls,
    is_video_bot,
    video_bot_image_url,
    video_bot_image_public_id,
    voice_id,
    human_handoff_enabled: human_handoff_enabled === 'true',
    human_handoff_emails: parsedHumanEmails,
  });

  logger.info('Bot created', { botId: bot._id, userId: req.user.id, name });

  // sync human and bot agents models
  if (human_handoff_enabled === 'true' && parsedHumanEmails.length > 0) {
    await HumanAgentService.syncBotAndHumanAgents({
      botId: bot._id,
      emails: parsedHumanEmails,
      invitedBy: req.user.id,
    });
  }

  // Start parallel data processing and slack integration
  const processingPromises = [];

  // 1. Process scraped markdown content (parallel)
  if (parsedScrapedContent.length > 0) {
    processingPromises.push(
      processMarkdownContent(
        parsedScrapedContent,
        bot._id,
        name,
        description
      ).catch((err) => {
        logger.error('Error in markdown processing', {
          botId: bot._id,
          error: err.message,
        });
        return 0;
      })
    );
  }

  // 2. Process PDF content (parallel)
  if (req.file) {
    processingPromises.push(
      processPDFContent(req.file, bot._id, name, description).catch((err) => {
        logger.error('Error in PDF processing', {
          botId: bot._id,
          error: err.message,
        });
        return 0;
      })
    );
  }

  // 3. Slack integration (parallel - independent of content processing)
  if (is_slack_enabled === 'true' && slack_channel_id) {
    processingPromises.push(
      (async () => {
        const slackIntegration = await SlackIntegration.findOne({
          userId: req.user.id,
        });

        if (slackIntegration?.slackAccessToken) {
          try {
            await axios.post(
              'https://slack.com/api/conversations.join',
              { channel: slack_channel_id },
              {
                headers: {
                  Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            logger.info('Bot joined Slack channel', {
              botId: bot._id,
              slack_channel_id,
            });
            return { slack: true };
          } catch (err) {
            logger.error('Error joining Slack channel', {
              botId: bot._id,
              slack_channel_id,
              error: err.response?.data || err.message,
            });
            return { slack: false };
          }
        } else {
          logger.warn('Slack integration not found, bot not added to channel', {
            botId: bot._id,
            userId: req.user.id,
          });
          return { slack: false };
        }
      })().catch((err) => {
        logger.error('Error in Slack integration', {
          botId: bot._id,
          error: err.message,
        });
        return { slack: false };
      })
    );
  }

  // Wait for all parallel operations to complete
  const results = await Promise.allSettled(processingPromises);

  // Calculate total QAs processed
  let markdownQAs = 0;
  let pdfQAs = 0;
  let slackJoined = false;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (typeof result.value === 'number') {
        if (parsedScrapedContent.length > 0 && index === 0) {
          markdownQAs = result.value;
        } else if (
          req.file &&
          (parsedScrapedContent.length > 0 ? index === 1 : index === 0)
        ) {
          pdfQAs = result.value;
        }
      } else if (result.value?.slack !== undefined) {
        slackJoined = result.value.slack;
      }
    }
  });

  // Build success message
  let messageParts = [`Bot "${name}" created successfully`];

  // Bot capabilities
  const capabilities = [];
  if (is_voice_enabled === 'true') capabilities.push('voice');
  if (is_video_bot) capabilities.push('video');
  if (capabilities.length > 0) {
    messageParts.push(`with ${capabilities.join(' & ')} support`);
  }

  // Languages
  if (parsedLanguages?.length > 0) {
    messageParts.push(`supporting ${parsedLanguages.length} language(s)`);
  }

  // Knowledge sources
  const processedSources = [];
  if (markdownQAs > 0) {
    processedSources.push(
      `${parsedScrapedContent.length} scraped page(s) (${markdownQAs} Q&As)`
    );
  }
  if (pdfQAs > 0) {
    processedSources.push(`PDF upload (${pdfQAs} Q&As)`);
  }
  if (processedSources.length > 0) {
    messageParts.push(`trained on ${processedSources.join(' and ')}`);
  }

  // Human handoff
  if (human_handoff_enabled === 'true' && parsedHumanEmails.length > 0) {
    messageParts.push(
      `with human handoff enabled for ${parsedHumanEmails.length} agent(s)`
    );
  }

  // Slack
  if (slackJoined) {
    messageParts.push('and connected to Slack');
  }

  const message = `${messageParts.join(', ')}.`;

  logger.info('Bot creation completed', {
    bot: {
      id: bot._id,
      name: bot.name,
      isVoiceEnabled: bot.is_voice_enabled,
      isVideoBot: bot.is_video_bot,
      supportedLanguagesCount: bot.supported_languages?.length || 0,
    },
    training: {
      markdown: {
        pages: parsedScrapedContent.length,
        qas: markdownQAs,
      },
      pdf: {
        uploaded: !!req.file,
        qas: pdfQAs,
      },
      totalQAs: markdownQAs + pdfQAs,
    },
    integrations: {
      slack: {
        enabled: is_slack_enabled === 'true',
        joined: slackJoined,
        channelId: slack_channel_id || null,
      },
      humanHandoff: {
        enabled: human_handoff_enabled === 'true',
        agentsCount: parsedHumanEmails.length,
      },
    },
    user: {
      id: req.user.id,
    },
  });

  return {
    bot_id: bot._id,
    message,

    bot: {
      name,
      description,
      website_url,
      is_voice_enabled: is_voice_enabled === 'true',
      is_video_bot,
      voice_id,
      video_bot_image_url,
      supported_languages: parsedLanguages,
      primary_purpose,
      specialisation_area,
      conversation_tone,
      response_style,
      target_audience,
      key_topics,
      keywords,
    },

    integrations: {
      slack: {
        enabled: is_slack_enabled === 'true',
        channel_id: slack_channel_id,
        connected: slackJoined,
      },
      human_handoff: {
        enabled: human_handoff_enabled === 'true',
        agents_count: parsedHumanEmails.length,
        agent_emails: parsedHumanEmails,
      },
    },

    training_summary: {
      scraped_pages: parsedScrapedContent.length,
      markdown_qas: markdownQAs,
      pdf_uploaded: !!req.file,
      pdf_qas: pdfQAs,
      total_qas: markdownQAs + pdfQAs,
    },

    meta: {
      created_at: bot.createdAt,
      created_by: req.user.id,
    },
  };
};

// ask query to a chatbot
exports.askBot = async (question, botId) => {
  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.error('Bot not found', { botId });
    throw new Error('Bot not found');
  }

  logger.info('Bot asked a question', { botId, question });

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

    logger.info('Best QA match found', { botId, score: bestScore, question });

    return { answer: bestMatch.answer, score: bestScore, source: 'qa' };
  }

  logger.warn('No strong QA match found', {
    botId,
    score: bestScore,
    question,
  });
  return { message: 'No match found.', score: bestScore };
};

// get all the chatbots(paginated)
exports.getAllChatBots = async (userId, { skip, limit, page }) => {
  logger.info('Fetching chat bots for user', {
    userId,
    page,
    limit,
  });

  const [bots, total] = await Promise.all([
    ChatBot.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ChatBot.countDocuments({ user: userId }),
  ]);

  logger.info('Fetched chat bots from DB', {
    userId,
    returnedCount: bots.length,
    totalBots: total,
  });

  return {
    bots,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + bots.length < total,
      hasPrevPage: page > 1,
    },
  };
};

// get bot by bot id
exports.getBotByBotId = async (botId) => {
  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn('Bot not found', { botId });
    throw new Error('Bot not found');
  }
  logger.info('Fetched bot by ID', { botId });
  return bot;
};

// delete bot by bot id
exports.deleteBotByBotId = async (botId, userId) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    logger.warn('Bot not found for deletion', { botId, userId });
    throw new Error('Bot not found');
  }

  // delete associated data with chatbot
  await Customization.findOneAndDelete({ botId });
  await QAHistory.deleteMany({ bot: botId });
  await ChatBot.findByIdAndDelete(botId);

  logger.info('Bot and associated data deleted', { botId, userId });
};

// update bot by bot id
exports.updateBotByBotId = async (botId, userId, body, file) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    logger.warn('Bot not found for update', { botId, userId });
    throw new Error('Bot not found');
  }

  const {
    name,
    website_url,
    description,
    is_voice_enabled,
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
    slack_channel_id,
    conversationFlow,
    scraped_content,
    scraped_urls,
    is_video_bot,
    video_bot_image_url,
    video_bot_image_public_id,
    voice_id,
    human_handoff_enabled,
    human_handoff_emails,
  } = body;

  if (!name || !description) {
    logger.error('Missing required fields for bot update', {
      botId,
      userId,
      name,
      description,
    });
    throw new Error('Missing required fields: name or description');
  }

  // Parse supported languages
  let parsedLanguages;
  try {
    parsedLanguages = JSON.parse(supported_languages);
    if (!Array.isArray(parsedLanguages)) {
      throw new Error('Not an array');
    }
  } catch {
    parsedLanguages = supported_languages
      ?.split(',')
      .map((lang) => lang.trim());
  }

  // Parse conversation flow
  let parsedConversationFlow = conversationFlow;
  if (typeof conversationFlow === 'string') {
    try {
      parsedConversationFlow = JSON.parse(conversationFlow);
    } catch {
      parsedConversationFlow = { nodes: [], edges: [] };
    }
  }

  // Parse scraped content
  let parsedScrapedContent = [];
  if (scraped_content) {
    try {
      parsedScrapedContent =
        typeof scraped_content === 'string'
          ? JSON.parse(scraped_content)
          : scraped_content;

      if (!Array.isArray(parsedScrapedContent)) {
        parsedScrapedContent = [parsedScrapedContent];
      }
    } catch (err) {
      logger.warn('Failed to parse scraped_content', { error: err.message });
      parsedScrapedContent = [];
    }
  }

  // Parse scraped URLs
  let parsedScrapedUrls = [];
  if (scraped_urls) {
    try {
      parsedScrapedUrls = JSON.parse(scraped_urls);
      if (!Array.isArray(parsedScrapedUrls)) {
        parsedScrapedUrls = [scraped_urls];
      }
    } catch {
      parsedScrapedUrls = [scraped_urls];
    }
  }

  const oldEmails = Array.isArray(bot.human_handoff_emails)
    ? bot.human_handoff_emails
    : [];

  let parsedHumanEmails;
  if (human_handoff_emails !== undefined) {
    if (Array.isArray(human_handoff_emails)) {
      parsedHumanEmails = human_handoff_emails;
    } else if (typeof human_handoff_emails === 'string') {
      try {
        parsedHumanEmails = JSON.parse(human_handoff_emails);
      } catch {
        parsedHumanEmails = human_handoff_emails
          .split(',')
          .map((e) => e.trim());
      }
    }
  }

  // Detect URL changes
  const prevUrls = Array.isArray(bot.scraped_urls)
    ? bot.scraped_urls.sort()
    : [];
  const newUrls = Array.isArray(parsedScrapedUrls)
    ? parsedScrapedUrls.sort()
    : [];
  const urlsChanged = JSON.stringify(prevUrls) !== JSON.stringify(newUrls);

  // Update bot fields
  Object.assign(bot, {
    name: name || bot.name,
    website_url: website_url || bot.website_url,
    description: description || bot.description,
    is_voice_enabled: is_voice_enabled === 'true',
    is_slack_enabled: is_slack_enabled === 'true',
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
    scraped_urls: parsedScrapedUrls || bot.scraped_urls,
    is_video_bot: is_video_bot,
    video_bot_image_url: video_bot_image_url,
    video_bot_image_public_id: video_bot_image_public_id,
    voice_id: voice_id,
    human_handoff_enabled: human_handoff_enabled === 'true',
    human_handoff_emails: parsedHumanEmails || bot.human_handoff_emails,
  });

  logger.info('Bot fields updated locally', { botId, userId });

  const newEmails = parsedHumanEmails || [];
  const addedEmails = newEmails.filter((email) => !oldEmails.includes(email));
  const removedEmails = oldEmails.filter((email) => !newEmails.includes(email));

  if (addedEmails.length > 0) {
    await HumanAgentService.syncBotAndHumanAgents({
      botId: bot._id,
      emails: addedEmails,
      invitedBy: userId,
    });
  }

  if (removedEmails.length > 0) {
    const agents = await HumanAgent.find({ email: { $in: removedEmails } });
    const agentIds = agents.map((a) => a._id);
    await BotAgent.updateMany(
      {
        bot: bot._id,
        humanAgent: { $in: agentIds },
      },
      { isEnabled: false }
    );
  }

  // Slack auto-join
  if (is_slack_enabled === 'true' && slack_channel_id) {
    const slackIntegration = await SlackIntegration.findOne({ userId });
    if (slackIntegration?.slackAccessToken) {
      try {
        await axios.post(
          'https://slack.com/api/conversations.join',
          { channel: slack_channel_id },
          {
            headers: {
              Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        logger.info('Bot joined Slack channel', { botId, slack_channel_id });
      } catch (err) {
        logger.error('Error joining Slack channel', {
          botId,
          slack_channel_id,
          error: err.response?.data || err.message,
        });
      }
    } else {
      logger.warn('Slack integration not found, bot not added to channel', {
        botId,
        userId,
      });
    }
  }

  // Handle QA regeneration
  if (file || urlsChanged) {
    await QAHistory.deleteMany({ bot: bot._id });
    logger.info('Deleted previous QAs before regeneration', { botId });

    const processingPromises = [];

    // 1. If new scraped content (and URLs changed)
    if (urlsChanged && parsedScrapedContent.length > 0) {
      processingPromises.push(
        processMarkdownContent(
          parsedScrapedContent,
          bot._id,
          name,
          description
        ).catch((err) => {
          logger.error('Error in markdown reprocessing', {
            botId,
            error: err.message,
          });
          return 0;
        })
      );
    }

    // 2. If new PDF uploaded
    if (file) {
      processingPromises.push(
        processPDFContent(file, bot._id, name, description).catch((err) => {
          logger.error('Error in PDF reprocessing', {
            botId,
            error: err.message,
          });
          return 0;
        })
      );
    }

    await Promise.allSettled(processingPromises);
  }

  await bot.save();
  logger.info('Bot updated and saved successfully', {
    botId,
    userId,
    urlsChanged,
  });

  return bot;
};

// get customization by bot id
exports.getCustomizationByBotId = async (botId) => {
  if (!botId) {
    logger.error('Get customization failed: Bot ID missing');
    throw new Error('Bot ID is required');
  }

  logger.info('Fetching customization', { botId });

  const customization = await Customization.findOne({ botId });

  if (customization) {
    logger.info('Customization fetched successfully', { botId });
  } else {
    logger.warn('No customization found', { botId });
  }

  return customization;
};

// save bot customization
exports.saveBotCustomization = async (botId, data) => {
  if (!botId) {
    logger.error('Save customization failed: Bot ID missing');
    throw new Error('Bot ID is required');
  }

  logger.info('Saving customization', { botId, data });

  const customization = await Customization.findOneAndUpdate(
    { botId },
    { ...data, botId },
    { new: true, upsert: true }
  );

  logger.info('Customization saved successfully', { botId });
  return customization;
};

// get all chat histories by bot id(paginated)
exports.getAllChatHistoriesByBotId = async (botId, page = 1, limit = 10) => {
  logger.info('Service: Retrieving all chat histories', {
    botId,
    page,
    limit,
  });

  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn('Bot not found while fetching histories', { botId });
    throw new Error('Bot not found');
  }

  const skip = (page - 1) * limit;

  const [sessions, totalSessions] = await Promise.all([
    FlowSession.find({ bot: botId })
      .select(
        '_id ipAddress userAgent isFinished createdAt lastUpdatedAt history'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    FlowSession.countDocuments({ bot: botId }),
  ]);

  const totalPages = Math.ceil(totalSessions / limit);

  logger.info('Service: Successfully retrieved chat histories', {
    botId,
    page,
    limit,
    totalSessions,
    returnedSessions: sessions.length,
  });

  return {
    botId,
    pagination: {
      page,
      limit,
      totalPages,
      totalSessions,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    sessions,
  };
};

// get chat history by session id
exports.getChatHistoryBySessionId = async (botId, sessionId) => {
  logger.info('Service: Retrieving specific chat history', {
    botId,
    sessionId,
  });

  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.warn('Bot not found while fetching specific history', {
      botId,
      sessionId,
    });
    throw new Error('Bot not found');
  }

  const session = await FlowSession.findOne({ _id: sessionId, bot: botId });
  if (!session) {
    logger.warn('Chat session not found', { botId, sessionId });
    throw new Error('Chat history not found');
  }

  const history = session.history || [];

  // ✅ Filter out unwanted "extra" entries:
  // - type = question/confirmation
  // - content is object (not string)
  // - immediately follows a user_input of the same node
  const cleanedHistory = history.filter((entry, index) => {
    const prev = history[index - 1];

    const isExtra =
      (entry.type === 'question' || entry.type === 'confirmation') &&
      typeof entry.content === 'object' &&
      prev?.type === 'user_input' &&
      prev?.nodeId === entry.nodeId;

    return !isExtra;
  });

  logger.info('Service: Successfully retrieved and cleaned chat history', {
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
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    lastUpdatedAt: session.lastUpdatedAt,
  };
};
