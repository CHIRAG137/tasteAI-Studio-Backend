const axios = require('axios');
const SlackIntegration = require('../models/SlackIntegration');
const ChatBot = require('../models/ChatBot');
const Customization = require('../models/Customisation');
const logger = require('../utils/logger');
const HumanAgentService = require('../services/humanAgentService');
const sendEmail = require('../utils/sendEmailUtil');
const User = require('../models/User');
const HumanAgent = require('../models/HumanAgent');
const { processMarkdownContent, processFileContent } = require('../utils/dataProcessingUtils');
const { encryptApiKey } = require('../utils/encryptionUtils');

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
    human_handoff_enabled,
    human_handoff_emails,
    require_visitor_email_verification,
    custom_llm_provider,
    custom_api_key_source,
    custom_api_key,
    custom_model,
  } = req.body;

  if (!name || !description) {
    logger.error('Bot creation failed - missing required fields', {
      name,
      description,
    });
    throw new Error('Missing required fields: name, or description');
  }

  // Validate custom LLM configuration
  let encryptedApiKey = null;
  if (custom_llm_provider) {
    if (!['gemini', 'openai', 'gemma'].includes(custom_llm_provider)) {
      throw new Error('Invalid custom_llm_provider. Must be "gemini", "openai", or "gemma"');
    }

    const keySource =
      custom_api_key_source && typeof custom_api_key_source === 'string'
        ? custom_api_key_source.toLowerCase()
        : 'bot';

    if (keySource !== 'bot' && keySource !== 'user') {
      throw new Error('Invalid custom_api_key_source. Must be "bot" or "user".');
    }

    if (keySource === 'bot') {
      if (!custom_api_key) {
        throw new Error('API key is required when custom_api_key_source is "bot"');
      }

      try {
        encryptedApiKey = encryptApiKey(custom_api_key);
        logger.debug('API key encrypted successfully for bot creation');
      } catch (err) {
        logger.error('Failed to encrypt API key', { error: err.message });
        throw new Error('Failed to encrypt API key. Please check encryption configuration.');
      }
    }
  }

  // Parse supported_languages
  let parsedLanguages;
  try {
    parsedLanguages = JSON.parse(supported_languages);
    if (!Array.isArray(parsedLanguages)) {
      throw new Error('Not an array');
    }
  } catch {
    parsedLanguages = supported_languages?.split(',').map((lang) => lang.trim());
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
        typeof scraped_content === 'string' ? JSON.parse(scraped_content) : scraped_content;

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
        parsedHumanEmails = human_handoff_emails.split(',').map((e) => e.trim());
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
    human_handoff_enabled: human_handoff_enabled === 'true',
    human_handoff_emails: parsedHumanEmails,
    require_visitor_email_verification: require_visitor_email_verification === 'true',

    custom_llm_provider: custom_llm_provider || null,
    custom_api_key_source: custom_llm_provider ? custom_api_key_source || 'bot' : 'bot',
    encrypted_api_key: encryptedApiKey,
    custom_model: custom_model || null,
  });

  logger.info('Bot created', { botId: bot._id, userId: req.user.id, name });

  // Ensure a customization document exists so embed/chat UI never renders with empty values.
  // This is safe even if the caller never opens the customization screen.
  try {
    await Customization.findOneAndUpdate(
      { botId: bot._id },
      {
        ...DEFAULT_EMBED_CUSTOMIZATION,
        botId: bot._id,
        headerTitle: name || DEFAULT_EMBED_CUSTOMIZATION.headerTitle,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (e) {
    logger.warn('Failed to create default customization for new bot', {
      botId: bot._id,
      error: e?.message,
    });
  }

  // sync human and bot agents models
  if (human_handoff_enabled === 'true' && parsedHumanEmails.length > 0) {
    await HumanAgentService.syncBotAndHumanAgents({
      botId: bot._id,
      emails: parsedHumanEmails,
      invitedBy: req.user.id,
    });
    // Notify existing agents (who already have passwords) that they were added
    try {
      const existingAgents = await HumanAgent.find({ email: { $in: parsedHumanEmails } });
      const inviter = await User.findById(req.user.id)
        .lean()
        .catch(() => null);
      for (const agent of existingAgents) {
        if (agent.isPasswordSet) {
          try {
            await sendEmail({
              to: agent.email,
              subject: `You've been added as an agent to ${name}`,
              html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 20px 0;">
            <h2 style="color: #064E3B; margin: 0;">You've been added as an agent</h2>
            <p style="color: #065F46; margin-top: 8px;">You can now respond to user handoff requests for <strong>${name}</strong>.</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e6f4ea; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #374151;">Hello${agent.displayName ? ` ${agent.displayName}` : ''},</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">${inviter ? inviter.displayName || inviter.email : 'An administrator'} has added you as a human agent for the bot <strong>${name}</strong>. You'll receive handoff requests from users and can respond via the Agent Dashboard.</p>
            <div style="text-align:center; margin: 18px 0;">
              <a href="${process.env.FRONTEND_URL}/agent/dashboard" style="background-color: #059669; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Open Agent Dashboard</a>
            </div>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">If you have questions, contact your administrator.</p>
          </div>
        </div>
              `,
            });
          } catch (e) {
            logger.error('Failed sending agent added notification', {
              error: e.message,
              email: agent.email,
              botId: bot._id,
            });
          }
        }
      }
    } catch (e) {
      logger.error('Error notifying existing agents after bot create', {
        error: e.message,
        botId: bot._id,
      });
    }
  }

  // Start parallel data processing and slack integration
  const trainingFilesMeta = [];
  const processingPromises = [];

  // 1. Process scraped markdown content (parallel)
  if (parsedScrapedContent.length > 0) {
    processingPromises.push(
      processMarkdownContent(parsedScrapedContent, bot._id, name, description, bot).catch((err) => {
        logger.error('Error in markdown processing', {
          botId: bot._id,
          error: err.message,
        });
        return 0;
      }),
    );
  }

  // 2. Process file content (PDF, TXT, DOC, XLSX, XLS)
  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      processingPromises.push(
        processFileContent(file, bot._id, name, description, bot)
          .catch((err) => {
            logger.error('Error in file processing', {
              botId: bot._id,
              filename: file.originalname,
              error: err.message,
            });
            return { success: false, qaCount: 0, metadata: {} };
          })
          .then((result) => {
            if (result?.metadata?.hash) {
              trainingFilesMeta.push({
                originalname: result.metadata.originalname,
                mimeType: result.metadata.mimeType,
                size: result.metadata.size,
                hash: result.metadata.hash,
                path: result.metadata.path,
                uploadedAt: new Date(),
              });
            }
            return result.qaCount || 0;
          }),
      );
    });
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
              },
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
      }),
    );
  }

  // Wait for all parallel operations to complete
  const results = await Promise.allSettled(processingPromises);

  // Save training file metadata if any files were uploaded and processed
  if (trainingFilesMeta.length > 0) {
    bot.training_files = trainingFilesMeta;
    await bot.save();
  }

  // Calculate total QAs processed
  let markdownQAs = 0;
  let fileQAs = 0;
  let slackJoined = false;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (typeof result.value === 'number') {
        if (parsedScrapedContent.length > 0 && index === 0) {
          markdownQAs = result.value;
        } else if (req.files && req.files.length > 0) {
          const offset = parsedScrapedContent.length > 0 ? 1 : 0;
          if (index >= offset && index < offset + req.files.length) {
            fileQAs += result.value;
          }
        }
      } else if (result.value?.slack !== undefined) {
        slackJoined = result.value.slack;
      }
    }
  });

  // Build success message
  const messageParts = [`Bot "${name}" created successfully`];

  // Bot capabilities
  const capabilities = [];
  if (is_voice_enabled === 'true') {
    capabilities.push('voice');
  }
  if (is_video_bot) {
    capabilities.push('video');
  }
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
    processedSources.push(`${parsedScrapedContent.length} scraped page(s) (${markdownQAs} Q&As)`);
  }
  if (fileQAs > 0) {
    processedSources.push(`${req.files.length} uploaded file(s) (${fileQAs} Q&As)`);
  }
  if (processedSources.length > 0) {
    messageParts.push(`trained on ${processedSources.join(' and ')}`);
  }

  // Human handoff
  if (human_handoff_enabled === 'true' && parsedHumanEmails.length > 0) {
    messageParts.push(`with human handoff enabled for ${parsedHumanEmails.length} agent(s)`);
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
      files: {
        uploaded: !!(req.files && req.files.length > 0),
        qas: fileQAs,
        count: req.files?.length || 0,
      },
      totalQAs: markdownQAs + fileQAs,
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
      files_uploaded: !!(req.files && req.files.length > 0),
      files_count: req.files?.length || 0,
      file_qas: fileQAs,
      total_qas: markdownQAs + fileQAs,
    },

    meta: {
      created_at: bot.createdAt,
      created_by: req.user.id,
    },
  };
};
