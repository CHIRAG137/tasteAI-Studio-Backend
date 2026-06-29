const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const SlackIntegration = require('../models/SlackIntegration');
const ChatBot = require('../models/ChatBot');
const QAHistory = require('../models/QAHistory');
const Customization = require('../models/Customisation');
const { getEmbedding } = require('../utils/gptUtils');
const { generateEmbedding } = require('../utils/llmClientUtils');
const { cosineSimilarity } = require('../utils/embedUtils');
const logger = require('../utils/logger');
const FlowSession = require('../models/FlowSession');
const HumanAgentService = require('../services/humanAgentService');
const sendEmail = require('../utils/sendEmailUtil');
const User = require('../models/User');
const { handleHumanAgentRemovalEscalation } = require('../services/handleHumanAgentRemovalService');
const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const { processMarkdownContent, processFileContent } = require('../utils/dataProcessingUtils');
const { encryptApiKey } = require('../utils/encryptionUtils');
const { sanitizeBotForResponse, sanitizeBotsForResponse } = require('../utils/botSanitizer');
const {
  buildPhoenixTraceUrl,
  getPhoenixRuntimeInfo,
  runPhoenixSpan,
  setPhoenixSpanAttributes,
} = require('../config/phoenixTracing');
const BotInteractionMetric = require('../models/BotInteractionMetric');

const DEFAULT_EMBED_CUSTOMIZATION = {
  // Chat defaults
  headerTitle: 'Chat Assistant',
  headerSubtitle: 'Online',
  placeholder: 'Type your message...',
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  messageBackgroundColor: '#f1f5f9',
  userMessageColor: '#3b82f6',
  botMessageColor: '#f1f5f9',
  textColor: '#1e293b',
  borderRadius: 8,
  fontFamily: 'Inter, sans-serif',
  headerBackground: '#ffffff',
  chatCustomCSS: '',
  useChatCustomCSS: false,

  // Button defaults (match schema defaults)
  buttonBackground: 'linear-gradient(135deg, #9b5de5, #f15bb5)',
  buttonColor: '#ffffff',
  buttonSize: '56',
  buttonBorderRadius: '50',
  buttonPosition: 'bottom-right',
  buttonBottom: '20',
  buttonRight: '20',
  buttonLeft: '20',
  buttonCustomCSS: '',
  useButtonCustomCSS: false,

  // Button features
  buttonText: 'Chat with us',
  buttonShowText: false,
  buttonTextPosition: 'left',
  buttonIcon: 'chat',
  buttonIconType: 'default',
  buttonCustomIcon: '',
  buttonIconSize: '24',
  buttonAnimation: 'none',
  buttonHoverAnimation: 'scale',
  buttonPulse: false,
  buttonShadow: '0 4px 10px rgba(0,0,0,0.3)',
  buttonTextColor: '#1e293b',
  buttonTextSize: '14',
  buttonPadding: '12',
};

async function askBotImpl(
  question,
  botId,
  flowSessionId = null,
  userId = null,
  chatHistory = [],
  matchedAnswer = null,
  userEmotion = null,
) {
  const overallStart = Date.now();
  const traceTimings = {
    embeddingGeneration: { start: null, duration: null },
    retrieval: { start: null, duration: null },
    promptGeneration: { start: null, duration: null },
    answerGeneration: { start: null, duration: null },
  };
  const retrievalTrace = {
    totalQAsSearched: 0,
    threshold: 0.85,
  };

  const bot = await ChatBot.findById(botId);
  if (!bot) {
    logger.error('Bot not found', { botId });
    throw new Error('Bot not found');
  }

  // Log which LLM is being used
  const llmType = bot.custom_llm_provider
    ? `custom (${bot.custom_llm_provider}, source: ${bot.custom_api_key_source}, model: ${bot.custom_model || 'default'})`
    : 'default';

  logger.info('Bot asked a question', { botId, question, flowSessionId, llmProvider: llmType });

  // ==================== EMBEDDING GENERATION ====================
  traceTimings.embeddingGeneration.start = Date.now();
  let inputEmbedding;
  let embeddingProvider = 'default';
  let embeddingModel = 'embedding-001';

  if (bot.custom_llm_provider && (bot.encrypted_api_key || bot.custom_api_key_source === 'user')) {
    try {
      logger.debug('Using custom LLM for embedding generation', {
        botId,
        provider: bot.custom_llm_provider,
        keySource: bot.custom_api_key_source,
      });
      embeddingProvider = bot.custom_llm_provider;
      embeddingModel = bot.custom_model || 'default';
      inputEmbedding = await generateEmbedding(question, botId, userId);
    } catch (error) {
      logger.error('Error generating embedding with custom LLM, falling back to default', {
        botId,
        provider: bot.custom_llm_provider,
        error: error.message,
      });
      embeddingProvider = 'default';
      embeddingModel = 'embedding-001';
      inputEmbedding = await getEmbedding(question);
    }
  } else {
    logger.debug('Using default LLM for embedding generation', { botId });
    inputEmbedding = await getEmbedding(question);
  }
  traceTimings.embeddingGeneration.duration = Date.now() - traceTimings.embeddingGeneration.start;

  // ==================== RETRIEVAL ====================
  traceTimings.retrieval.start = Date.now();
  const qas = await QAHistory.find({ bot: botId });
  retrievalTrace.totalQAsSearched = qas.length;

  let bestMatch = null,
    bestScore = -1;

  for (const qa of qas) {
    const storedEmbedding = new Float32Array(qa.embedding.buffer);
    const score = cosineSimilarity(inputEmbedding, storedEmbedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }
  traceTimings.retrieval.duration = Date.now() - traceTimings.retrieval.start;

  let answer = null;
  let source = 'qa';
  let sourceDescription = null;
  const retrievalThreshold = 0.85;
  retrievalTrace.threshold = retrievalThreshold;

  if (bestScore > retrievalThreshold && bestMatch) {
    answer = bestMatch.answer;
    sourceDescription = `Matched Q&A: "${bestMatch.question}"`;
    logger.info('Best QA match found', { botId, score: bestScore, question });
  } else {
    logger.warn('No strong QA match found', {
      botId,
      score: bestScore,
      question,
    });

    // Try to answer using dataset from SpreadsheetConfig if available
    try {
      const SpreadsheetConfig = require('../models/SpreadsheetConfig');
      const spreadsheetConfig = await SpreadsheetConfig.findOne({ bot: botId });

      if (spreadsheetConfig && spreadsheetConfig.datasetDataAsString) {
        logger.info('Attempting to answer using dataset from SpreadsheetConfig', {
          botId,
          datasetDescription: spreadsheetConfig.datasetDescription?.substring(0, 50),
          hasDataset: !!spreadsheetConfig.datasetDataAsString,
        });

        const { getLLMClient } = require('../utils/llmClientUtils');
        const llmClient = await getLLMClient(botId, userId);

        logger.info('Using LLM for dataset-based answer', {
          botId,
          llmProvider: bot.custom_llm_provider || 'default',
          customLLMModel: bot.custom_model || null,
          keySource: bot.custom_api_key_source || 'bot',
        });

        // Build the dataset-aware prompt with complete context
        const chatHistoryText =
          chatHistory && chatHistory.length > 0
            ? chatHistory.map((msg) => `${msg.from || 'User'}: ${msg.text}`).join('\n')
            : 'No previous chat history';

        const fieldDescriptionsText =
          spreadsheetConfig.fieldDescriptions &&
          Object.keys(spreadsheetConfig.fieldDescriptions).length > 0
            ? Object.entries(spreadsheetConfig.fieldDescriptions)
                .map(([field, desc]) => `- ${field}: ${desc}`)
                .join('\n')
            : 'Field descriptions not available';

        const datasetPrompt = `You are an AI assistant with specialized knowledge about a dataset.

## Dataset Information
**Description**: ${spreadsheetConfig.datasetDescription || 'Dataset containing business information'}

**Field Descriptions**:
${fieldDescriptionsText}

${
  spreadsheetConfig.availableColumns && spreadsheetConfig.availableColumns.length > 0
    ? `**Available Fields**: ${spreadsheetConfig.availableColumns.join(', ')}`
    : ''
}

## Complete Dataset
${spreadsheetConfig.datasetDataAsString}

## Conversation Context

**Chat History**:
${chatHistoryText}

**User's Current Question**: "${question}"

**User's Tone/Preference**: ${userEmotion || 'neutral'} (adjust response detail and tone accordingly)

## Instructions
Based on the dataset information, field descriptions, chat history, and the complete dataset provided above:
1. Determine if the user's question is related to this dataset
2. If related, analyze the data and provide a comprehensive answer using the actual data
3. If not related to the dataset, clearly state that the question cannot be answered using this dataset
4. Always reference specific data points or patterns from the dataset in your answer
5. Adjust your response length and detail based on the user's tone/preference
6. If asking for predictions or analysis, explain your reasoning based on the data patterns`;

        const llmResponse = await llmClient.generateSummary(datasetPrompt);

        if (
          llmResponse &&
          !llmResponse.toLowerCase().includes('cannot answer') &&
          !llmResponse.toLowerCase().includes('cannot be answered') &&
          !llmResponse.toLowerCase().includes('not related to')
        ) {
          answer = llmResponse;
          source = 'dataset';
          sourceDescription = `Dataset: ${spreadsheetConfig.datasetDescription?.substring(0, 100) || 'Spreadsheet'}`;

          logger.info('Answered using dataset context', {
            botId,
            source,
            questionLength: question.length,
          });
        }
      }
    } catch (err) {
      logger.error('Error attempting dataset answer', {
        botId,
        error: err.message,
      });
      // Don't throw, fall through to other options
    }

    // Fallback: Try configured spreadsheet analysis (if outputColumn is configured)
    if (!answer) {
      try {
        const SpreadsheetConfig = require('../models/SpreadsheetConfig');
        const spreadsheetConfig = await SpreadsheetConfig.findOne({
          bot: botId,
          isConfigured: true,
        });

        if (spreadsheetConfig && spreadsheetConfig.outputColumn) {
          logger.info('Attempting to answer using spreadsheet prediction configuration', {
            botId,
            outputColumn: spreadsheetConfig.outputColumn,
          });

          const { getLLMClient } = require('../utils/llmClientUtils');
          const llmClient = await getLLMClient(botId, userId);

          logger.info('Using LLM for spreadsheet prediction answer', {
            botId,
            llmProvider: bot.custom_llm_provider || 'default',
            customLLMModel: bot.custom_model || null,
            keySource: bot.custom_api_key_source || 'bot',
            outputColumn: spreadsheetConfig.outputColumn,
          });

          const dataContext = spreadsheetConfig.data
            .slice(0, 10) // Use first 10 rows for context
            .map((row) => JSON.stringify(row))
            .join('\n');

          const predictionPrompt = `You are an AI assistant analyzing spreadsheet data.

The user is asking: "${question}"

You have access to this spreadsheet data:
Columns: ${spreadsheetConfig.availableColumns.join(', ')}
Output Column (to predict): ${spreadsheetConfig.outputColumn}
Input Columns (features): ${spreadsheetConfig.inputColumns.join(', ')}

Sample data:
${dataContext}

Based on this data, answer the user's question. If the question appears to be asking for a prediction or analysis of the data, provide an answer based on the patterns in the data. If the question is not related to the spreadsheet data, say you cannot answer based on the available data.`;

          const llmResponse = await llmClient.generateSummary(predictionPrompt);

          if (
            llmResponse &&
            !llmResponse.toLowerCase().includes('cannot answer') &&
            !llmResponse.toLowerCase().includes('not related')
          ) {
            answer = llmResponse;
            source = 'spreadsheet';
            sourceDescription = `Spreadsheet: ${spreadsheetConfig.outputColumn}`;

            logger.info('Answered using spreadsheet prediction data', {
              botId,
              source,
              questionLength: question.length,
            });
          }
        }
      } catch (err) {
        logger.error('Error attempting spreadsheet analysis', {
          botId,
          error: err.message,
        });
        // Don't throw, fall through to 'none'
      }
    }

    if (!answer) {
      source = 'none';
    }
  }

  // Save to FlowSession if sessionId is provided
  if (flowSessionId) {
    try {
      const session = await FlowSession.findById(flowSessionId);
      if (session) {
        // Add the Q&A to the history
        session.history.push({
          mode: 'qa',
          question,
          answer: answer || 'No match found',
          timestamp: new Date(),
          fromUser: false,
          score: bestScore,
        });

        // Update current mode to QA
        if (session.currentMode !== 'handoff') {
          session.currentMode = 'qa';
        }

        await session.save();
        logger.info('QA saved to FlowSession', { flowSessionId, botId });
      }
    } catch (error) {
      logger.error('Error saving QA to FlowSession', {
        error: error.message,
        flowSessionId,
        botId,
      });
      // Don't throw error, continue with response
    }
  }

  // ==================== PROMPT GENERATION & ANSWER GENERATION ====================
  traceTimings.promptGeneration.start = Date.now();

  // Always generate a response using LLM with context
  const { getLLMClient } = require('../utils/llmClientUtils');
  const llmClient = await getLLMClient(botId, userId);

  logger.info('Using LLM for final response generation', {
    botId,
    llmProvider: bot.custom_llm_provider || 'default',
    customLLMModel: bot.custom_model || null,
    keySource: bot.custom_api_key_source || 'bot',
    answerSource: source,
  });

  // Prepare context
  const context = {
    chatHistory: chatHistory || [],
    matchedAnswer: matchedAnswer || answer,
    userEmotion: userEmotion || 'neutral',
    botPersona: {
      primaryPurpose: bot.primary_purpose,
      conversationalTone: bot.conversation_tone,
      responseStyle: bot.response_style,
      targetAudience: bot.target_audience,
      specializationArea: bot.specialisation_area,
      keyTopics: bot.key_topics,
      keywords: bot.keywords,
      customInstructions: bot.custom_instructions,
    },
  };

  const prompt = `You are an AI assistant with the following persona:
- Primary Purpose: ${context.botPersona.primaryPurpose || 'General assistance'}
- Conversational Tone: ${context.botPersona.conversationalTone || 'Professional'}
- Response Style: ${context.botPersona.responseStyle || 'Concise'}
- Target Audience: ${context.botPersona.targetAudience || 'General users'}
- Specialization Area: ${context.botPersona.specializationArea || 'General'}
- Key Topics: ${context.botPersona.keyTopics || 'Various'}
- Keywords: ${context.botPersona.keywords || 'None'}
- Custom Instructions: ${context.botPersona.customInstructions || 'None'}

Chat History:
${context.chatHistory.map((msg) => `${msg.from}: ${msg.text}`).join('\n')}

Matched Answer from Knowledge Base: ${context.matchedAnswer || 'No direct match found'}

User's Current Question: "${question}"

User's Emotion/Preference: ${context.userEmotion} (e.g., wants detailed answer, short answer, etc.)

Based on the chat history, matched answer, and user's emotion, provide the best possible response. If the matched answer is relevant, incorporate it naturally. Adjust the response length and detail based on the user's emotion/preference.`;

  traceTimings.promptGeneration.duration = Date.now() - traceTimings.promptGeneration.start;

  // ==================== ANSWER GENERATION ====================
  traceTimings.answerGeneration.start = Date.now();

  try {
    const llmResponse = await llmClient.generateSummary(prompt);
    answer = llmResponse || answer || 'I apologize, but I cannot provide an answer at this time.';
    if (source === 'none') {
      source = 'llm';
      sourceDescription = 'LLM generated response';
    }
    logger.info('Generated LLM response with context', { botId, question, answer });
  } catch (error) {
    logger.error('Error generating LLM response', { botId, error: error.message });
    // Fallback to matched answer or default
    answer = answer || 'I apologize, but I cannot provide an answer at this time.';
  }

  traceTimings.answerGeneration.duration = Date.now() - traceTimings.answerGeneration.start;

  // Save the final LLM answer to QAHistory (only the generated response)
  try {
    await QAHistory.create({
      bot: botId,
      question,
      answer,
      embedding: Buffer.from(inputEmbedding.buffer),
      source,
    });
    logger.info('Final answer saved to QAHistory', { botId, question });
  } catch (error) {
    logger.error('Error saving final answer to QAHistory', {
      botId,
      error: error.message,
    });
  }

  // Return the final answer with trace data
  return {
    answer,
    score: bestScore,
    source,
    sourceDescription,
    matchedMatch: bestMatch,
    traceTimings,
    retrievalTrace,
    finalPrompt: prompt,
    embeddingProvider,
    embeddingModel,
    llmProvider: bot.custom_llm_provider || 'default',
    llmModel: bot.custom_model || 'gemini-3.1-pro-preview',
  };
}

// ask query to a chatbot
exports.askBot = async (
  question,
  botId,
  flowSessionId = null,
  userId = null,
  chatHistory = [],
  matchedAnswer = null,
  userEmotion = null,
) => {
  const startedAt = Date.now();
  return runPhoenixSpan(
    'bot.answer_question',
    'AGENT',
    {
      'bot.id': String(botId),
      'session.id': flowSessionId ? String(flowSessionId) : undefined,
      'user.id': userId ? String(userId) : undefined,
      'input.value': question,
      'input.mime_type': 'text/plain',
      'metadata.chat_history_count': Array.isArray(chatHistory) ? chatHistory.length : 0,
      'metadata.user_emotion': userEmotion || 'neutral',
    },
    async (span) => {
      let result;
      const spanContext =
        span && typeof span.spanContext === 'function' ? span.spanContext() : null;
      const phoenixTraceId = spanContext?.traceId || null;
      const phoenixSpanId = spanContext?.spanId || null;
      try {
        result = await askBotImpl(
          question,
          botId,
          flowSessionId,
          userId,
          chatHistory,
          matchedAnswer,
          userEmotion,
        );
      } finally {
        const latencyMs = Date.now() - startedAt;
        if (result) {
          const confidence =
            typeof result.score === 'number' && Number.isFinite(result.score)
              ? Math.max(0, Math.min(1, result.score))
              : null;
          const usedFallback =
            result.source === 'none' ||
            !result.answer ||
            result.answer.toLowerCase().includes('cannot provide an answer') ||
            result.answer.toLowerCase().includes('no match found');
          const hallucinationRisk =
            confidence === null
              ? usedFallback
                ? 0.8
                : 0.45
              : Math.max(0, Math.min(1, 1 - confidence));

          // Build detailed trace object
          const traceData = {
            embeddingGeneration: {
              durationMs: result.traceTimings?.embeddingGeneration?.duration || null,
              provider: result.embeddingProvider || 'default',
              model: result.embeddingModel || 'embedding-001',
            },
            retrieval: {
              durationMs: result.traceTimings?.retrieval?.duration || null,
              totalQAsSearched: result.retrievalTrace?.totalQAsSearched ?? null,
              matchedQAId: result.matchedMatch?._id || null,
              matchedQuestion: result.matchedMatch?.question || null,
              matchedAnswer: result.matchedMatch?.answer || null,
              retrievalScore: result.score || null,
              retrievalThreshold: result.retrievalTrace?.threshold || 0.85,
            },
            fallback: {
              used: usedFallback,
              source: result.source || 'unknown',
              sourceDescription: result.sourceDescription || null,
            },
            promptGeneration: {
              durationMs: result.traceTimings?.promptGeneration?.duration || null,
              finalPromptLength: result.finalPrompt?.length || null,
              finalPrompt: result.finalPrompt || null,
            },
            answerGeneration: {
              durationMs: result.traceTimings?.answerGeneration?.duration || null,
              llmProvider: result.llmProvider || 'default',
              llmModel: result.llmModel || 'gemini-3.1-pro-preview',
            },
            totalDurationMs: latencyMs,
          };
          const phoenixInfo = getPhoenixRuntimeInfo(phoenixTraceId);

          BotInteractionMetric.create({
            bot: botId,
            flowSession: flowSessionId || null,
            question,
            answer: result.answer || '',
            source: result.source || 'unknown',
            confidence,
            latencyMs,
            usedFallback,
            groundednessScore: Math.max(0, Math.min(1, 1 - hallucinationRisk)),
            hallucinationRisk,
            userEmotion: userEmotion || 'neutral',
            metadata: {
              chatHistoryCount: Array.isArray(chatHistory) ? chatHistory.length : 0,
            },
            phoenix: {
              enabled: Boolean(phoenixInfo.enabled && phoenixTraceId),
              projectName: phoenixInfo.projectName,
              baseUrl: phoenixInfo.baseUrl,
              traceId: phoenixTraceId,
              spanId: phoenixSpanId,
              spanName: 'bot.answer_question',
              traceUrl: phoenixTraceId
                ? phoenixInfo.traceUrl || buildPhoenixTraceUrl(phoenixTraceId)
                : null,
              traceUrlSource: phoenixInfo.traceUrlSource,
              mcpServer: phoenixInfo.mcpServer || 'phoenix',
            },
            trace: traceData,
          }).catch((error) => {
            logger.warn('Failed to save bot interaction metric', {
              botId,
              error: error.message,
            });
          });
        }
      }

      setPhoenixSpanAttributes(span, {
        'output.value': result?.answer,
        'output.mime_type': 'text/plain',
        'metadata.answer_source': result?.source,
        'metadata.match_score': result?.score,
        'metadata.latency_ms': Date.now() - startedAt,
        'metadata.phoenix_trace_id': phoenixTraceId,
        'metadata.phoenix_span_id': phoenixSpanId,
      });

      return result;
    },
  );
};

// get all the chatbots(paginated)
exports.getAllChatBots = async (userId, { skip, limit, page }) => {
  logger.info('Fetching chat bots for user', {
    userId,
    page,
    limit,
  });

  const [bots, total] = await Promise.all([
    ChatBot.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatBot.countDocuments({ user: userId }),
  ]);

  logger.info('Fetched chat bots from DB', {
    userId,
    returnedCount: bots.length,
    totalBots: total,
  });

  // Sanitize bots to remove sensitive fields before sending to frontend
  const sanitizedBots = sanitizeBotsForResponse(bots);

  return {
    bots: sanitizedBots,
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

  // Sanitize bot to remove sensitive fields before returning to frontend
  return sanitizeBotForResponse(bot);
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
exports.updateBotByBotId = async (botId, userId, body, files) => {
  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    logger.warn('Bot not found for update', { botId, userId });
    throw new Error('Bot not found');
  }

  let {
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
    require_visitor_auth0_identity,
    require_visitor_email_verification,
    custom_llm_provider,
    custom_api_key_source,
    custom_api_key,
    custom_model,
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

  // Validate and encrypt custom LLM configuration
  let encryptedApiKey = bot.encrypted_api_key;
  if (custom_llm_provider !== undefined) {
    if (!custom_llm_provider) {
      // Clearing custom LLM
      encryptedApiKey = null;
      custom_llm_provider = null;
      custom_api_key_source = 'bot';
    } else {
      if (!['gemini', 'openai', 'gemma'].includes(custom_llm_provider)) {
        throw new Error('Invalid custom_llm_provider. Must be "gemini", "openai", or "gemma"');
      }

      const nextKeySource =
        custom_api_key_source && typeof custom_api_key_source === 'string'
          ? custom_api_key_source.toLowerCase()
          : bot.custom_api_key_source || 'bot';

      if (nextKeySource !== 'bot' && nextKeySource !== 'user') {
        throw new Error('Invalid custom_api_key_source. Must be "bot" or "user".');
      }

      if (nextKeySource === 'user') {
        encryptedApiKey = null;
        custom_api_key_source = 'user';
      } else {
        custom_api_key_source = 'bot';
        if (custom_api_key) {
          try {
            encryptedApiKey = encryptApiKey(custom_api_key);
            logger.debug('API key encrypted successfully for bot update');
          } catch (err) {
            logger.error('Failed to encrypt API key', { error: err.message });
            throw new Error('Failed to encrypt API key. Please check encryption configuration.');
          }
        } else if (!bot.encrypted_api_key) {
          throw new Error('API key is required when custom_api_key_source is "bot"');
        }
      }
    }
  }

  // Parse supported languages
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

  // Parse scraped URLs. Preserve existing values if the field was omitted from the update request.
  let parsedScrapedUrls = Array.isArray(bot.scraped_urls) ? bot.scraped_urls : [];
  if (scraped_urls !== undefined) {
    try {
      parsedScrapedUrls = JSON.parse(scraped_urls);
      if (!Array.isArray(parsedScrapedUrls)) {
        parsedScrapedUrls = [scraped_urls];
      }
    } catch {
      parsedScrapedUrls = [scraped_urls];
    }
  }

  // Parse preserved existing training files metadata from update request
  let preservedTrainingFiles = Array.isArray(bot.training_files) ? bot.training_files : [];
  if (body.existing_training_files !== undefined) {
    try {
      preservedTrainingFiles =
        typeof body.existing_training_files === 'string'
          ? JSON.parse(body.existing_training_files)
          : body.existing_training_files;
      if (!Array.isArray(preservedTrainingFiles)) {
        preservedTrainingFiles = [];
      }
    } catch {
      preservedTrainingFiles = [];
    }
  }

  const oldEmails = Array.isArray(bot.human_handoff_emails) ? bot.human_handoff_emails : [];

  const oldTrainingFiles = Array.isArray(bot.training_files) ? bot.training_files : [];
  const preservedFileHashes = new Set(
    preservedTrainingFiles
      .map((file) => file.hash)
      .filter((hash) => typeof hash === 'string' && hash.length > 0),
  );
  const removedTrainingFiles = oldTrainingFiles.filter(
    (file) => !preservedFileHashes.has(file.hash),
  );

  let parsedHumanEmails;
  if (human_handoff_emails !== undefined) {
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

  // Detect URL changes
  const prevUrls = Array.isArray(bot.scraped_urls) ? bot.scraped_urls.sort() : [];
  const newUrls = Array.isArray(parsedScrapedUrls) ? parsedScrapedUrls.sort() : [];
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
    is_video_bot,
    video_bot_image_url,
    video_bot_image_public_id,
    human_handoff_enabled: human_handoff_enabled === 'true',
    human_handoff_emails: parsedHumanEmails || bot.human_handoff_emails,
    require_visitor_email_verification:
      require_visitor_email_verification !== undefined
        ? require_visitor_email_verification === 'true'
        : bot.require_visitor_email_verification,

    custom_llm_provider:
      custom_llm_provider !== undefined ? custom_llm_provider : bot.custom_llm_provider,
    custom_api_key_source:
      custom_llm_provider !== undefined
        ? custom_llm_provider
          ? custom_api_key_source || bot.custom_api_key_source || 'bot'
          : 'bot'
        : bot.custom_api_key_source || 'bot',
    encrypted_api_key: encryptedApiKey,
    custom_model: custom_model || bot.custom_model,
  });

  logger.info('Bot fields updated locally', { botId, userId });

  const newEmails = parsedHumanEmails || [];
  const addedEmails = newEmails.filter((email) => !oldEmails.includes(email));
  const removedEmails = oldEmails.filter((email) => !newEmails.includes(email));

  let removedAgentIds = [];

  if (addedEmails.length > 0) {
    await HumanAgentService.syncBotAndHumanAgents({
      botId: bot._id,
      emails: addedEmails,
      invitedBy: userId,
    });

    // Notify existing agents (already have password) that they were invited/added
    try {
      const existingAgents = await HumanAgent.find({ email: { $in: addedEmails } });
      const inviter = await User.findById(userId)
        .lean()
        .catch(() => null);
      for (const agent of existingAgents) {
        if (agent.isPasswordSet) {
          try {
            await sendEmail({
              to: agent.email,
              subject: `You've been added as an agent to ${bot.name}`,
              html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 20px 0;">
            <h2 style="color: #064E3B; margin: 0;">You've been added as an agent</h2>
            <p style="color: #065F46; margin-top: 8px;">You can now respond to user handoff requests for <strong>${bot.name}</strong>.</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e6f4ea; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #374151;">Hello${agent.displayName ? ` ${agent.displayName}` : ''},</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">${inviter ? inviter.displayName || inviter.email : 'An administrator'} has added you as a human agent for the bot <strong>${bot.name}</strong>. You'll receive handoff requests from users and can respond via the Agent Dashboard.</p>
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
      logger.error('Error notifying existing agents after bot update', {
        error: e.message,
        botId: bot._id,
      });
    }
  }

  if (removedEmails.length > 0) {
    const agents = await HumanAgent.find({ email: { $in: removedEmails } });
    const agentIds = agents.map((a) => a._id);
    removedAgentIds = agentIds;
    await BotAgent.updateMany(
      {
        bot: bot._id,
        humanAgent: { $in: agentIds },
      },
      { isEnabled: false },
    );
    logger.info('Disabled bot-agent relationships for removed agents', {
      botId,
      removedEmails,
      agentIds: agentIds.map((id) => id.toString()),
    });
    try {
      const remover = await User.findById(userId)
        .lean()
        .catch(() => null);
      for (const email of removedEmails) {
        try {
          await sendEmail({
            to: email,
            subject: `Access revoked: ${bot.name} agent access removed`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 20px 0;">
            <h2 style="color: #9b1c1c; margin: 0;">Agent access revoked</h2>
            <p style="color: #6b1f1f; margin-top: 8px;">Your access to the agent dashboard for <strong>${bot.name}</strong> has been revoked.</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #fdecea; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #374151;">Hello,</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">Your agent access for the bot <strong>${bot.name}</strong> has been removed by ${remover ? remover.displayName || remover.email : 'an administrator'}.</p>
            <p style="margin: 0 0 12px 0; color: #374151;">If you believe this was a mistake or have questions, please contact the administrator who invited you.</p>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">This change affects only the access to this bot and does not delete your account.</p>
          </div>
        </div>
              `,
          });
        } catch (e) {
          logger.error('Failed sending agent removed notification', {
            error: e.message,
            email,
            botId: bot._id,
          });
        }
      }
    } catch (e) {
      logger.error('Error sending removed-agent notifications', {
        error: e.message,
        botId: bot._id,
      });
    }
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
          },
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

  // Handle QA regeneration. Preserve unchanged training files whenever possible.
  const shouldProcessFiles = files && files.length > 0;
  const removedFileHashes = removedTrainingFiles
    .map((file) => file.hash)
    .filter((hash) => typeof hash === 'string' && hash.length > 0);

  const processPromises = [];
  const newTrainingFilesMeta = [];

  const existingFileHashSet = new Set(oldTrainingFiles.map((file) => file.hash).filter(Boolean));

  // If any training file was removed, delete only QAs tied to that file hash.
  if (removedFileHashes.length > 0) {
    await QAHistory.deleteMany({
      bot: bot._id,
      sourceFileHash: { $in: removedFileHashes },
    });
    logger.info('Deleted QAs for removed training files', {
      botId,
      removedFileHashes,
    });
  }

  // Only delete scraped-content QAs if scraped URLs changed.
  if (urlsChanged) {
    await QAHistory.deleteMany({ bot: bot._id, source: 'scrape' });
    logger.info('Deleted scraped QAs because scraped URLs changed', { botId });
    if (parsedScrapedContent.length > 0) {
      processPromises.push(
        processMarkdownContent(parsedScrapedContent, bot._id, name, description, bot).catch(
          (err) => {
            logger.error('Error in markdown reprocessing', {
              botId,
              error: err.message,
            });
            return 0;
          },
        ),
      );
    }
  }

  // Process uploaded files only when provided.
  if (shouldProcessFiles) {
    for (const file of files) {
      let fileHash;
      try {
        const fileBuffer = fs.readFileSync(file.path);
        fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      } catch (err) {
        logger.error('Error hashing uploaded file', {
          botId,
          filename: file.originalname,
          error: err.message,
        });
        continue;
      }

      if (existingFileHashSet.has(fileHash)) {
        logger.info('Skipped processing duplicate file upload', {
          botId,
          filename: file.originalname,
          hash: fileHash,
        });

        if (!preservedFileHashes.has(fileHash)) {
          const existingMeta = oldTrainingFiles.find((meta) => meta.hash === fileHash);
          if (existingMeta) {
            preservedTrainingFiles.push(existingMeta);
          }
        }
        continue;
      }

      processPromises.push(
        processFileContent(file, bot._id, name, description, bot)
          .catch((err) => {
            logger.error('Error in file reprocessing', {
              botId,
              filename: file.originalname,
              error: err.message,
            });
            return { success: false, qaCount: 0, metadata: {} };
          })
          .then((result) => {
            if (result?.metadata?.hash) {
              newTrainingFilesMeta.push({
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
    }
  }

  if (processPromises.length > 0) {
    await Promise.allSettled(processPromises);
  }

  bot.training_files = [
    ...preservedTrainingFiles.filter((file) => file && file.hash),
    ...newTrainingFilesMeta,
  ];

  await bot.save();

  if (removedAgentIds.length > 0) {
    try {
      logger.info('Starting handoff escalation for removed agents', {
        botId,
        removedAgentIds: removedAgentIds.map((id) => id.toString()),
      });

      await handleHumanAgentRemovalEscalation(bot._id, removedAgentIds);

      logger.info('Handoff escalation completed successfully', {
        botId,
        removedAgentIds: removedAgentIds.map((id) => id.toString()),
      });
    } catch (escalationError) {
      logger.error('Error during handoff escalation', {
        error: escalationError.message,
        stack: escalationError.stack,
        botId,
        removedAgentIds: removedAgentIds.map((id) => id.toString()),
      });
    }
  }

  logger.info('Bot updated and saved successfully', {
    botId,
    userId,
    urlsChanged,
  });

  // Sanitize bot to remove sensitive fields before returning to frontend
  return sanitizeBotForResponse(bot);
};

// get customization by bot id
exports.getCustomizationByBotId = async (botId) => {
  if (!botId) {
    logger.error('Get customization failed: Bot ID missing');
    throw new Error('Bot ID is required');
  }

  logger.info('Fetching customization', { botId });

  let customization = await Customization.findOne({ botId });

  if (customization) {
    logger.info('Customization fetched successfully', { botId });
    return customization;
  }

  // If missing, create it with defaults so clients (embed/widget) always get a full object.
  logger.warn('No customization found; creating defaults', { botId });
  customization = await Customization.create({ ...DEFAULT_EMBED_CUSTOMIZATION, botId });
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
    { new: true, upsert: true },
  );

  logger.info('Customization saved successfully', { botId });
  return customization;
};

const serializeTraceMetric = (metric) => {
  if (!metric) {
    return null;
  }

  return {
    id: String(metric._id),
    question: metric.question || '',
    answer: metric.answer || '',
    source: metric.source || 'unknown',
    confidence: metric.confidence,
    latencyMs: metric.latencyMs,
    usedFallback: metric.usedFallback,
    groundednessScore: metric.groundednessScore,
    hallucinationRisk: metric.hallucinationRisk,
    userEmotion: metric.userEmotion,
    phoenix: metric.phoenix || {},
    trace: metric.trace || {},
    createdAt: metric.createdAt,
  };
};

const attachTraceMetricsToSession = (session, metrics) => {
  const serializedMetrics = metrics.map(serializeTraceMetric).filter(Boolean);
  const usedMetricIds = new Set();

  const history = (session.history || []).map((entry) => {
    if (entry?.mode !== 'qa' || !entry.question) {
      return entry;
    }

    const matchingMetric = serializedMetrics.find((metric) => {
      if (usedMetricIds.has(metric.id)) {
        return false;
      }
      return metric.question === entry.question;
    });

    if (matchingMetric) {
      usedMetricIds.add(matchingMetric.id);
      return {
        ...entry,
        traceMetric: matchingMetric,
      };
    }

    return entry;
  });

  return {
    ...session,
    history,
    traceMetrics: serializedMetrics,
  };
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
      .select('_id ipAddress userAgent isFinished createdAt lastUpdatedAt history')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    FlowSession.countDocuments({ bot: botId }),
  ]);

  const sessionIds = sessions.map((session) => session._id);
  const metrics = await BotInteractionMetric.find({
    bot: botId,
    flowSession: { $in: sessionIds },
  })
    .sort({ createdAt: 1 })
    .lean();

  const metricsBySessionId = metrics.reduce((acc, metric) => {
    const key = String(metric.flowSession);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(metric);
    return acc;
  }, {});

  const sessionsWithTrace = sessions.map((session) =>
    attachTraceMetricsToSession(session, metricsBySessionId[String(session._id)] || []),
  );

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
    sessions: sessionsWithTrace,
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

  const session = await FlowSession.findOne({ _id: sessionId, bot: botId }).lean();
  if (!session) {
    logger.warn('Chat session not found', { botId, sessionId });
    throw new Error('Chat history not found');
  }

  const metrics = await BotInteractionMetric.find({
    bot: botId,
    flowSession: sessionId,
  })
    .sort({ createdAt: 1 })
    .lean();
  const sessionWithTrace = attachTraceMetricsToSession(session, metrics);
  const history = sessionWithTrace.history || [];

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
    summary: session.summary || null,
    summaryGeneratedAt: session.summaryGeneratedAt || null,
    createdAt: session.createdAt,
    lastUpdatedAt: session.lastUpdatedAt,
    traceMetrics: sessionWithTrace.traceMetrics,
  };
};

exports.getSessionTraceTimeline = async (botId, sessionId) => {
  const bot = await ChatBot.findById(botId);
  if (!bot) {
    throw new Error('Bot not found');
  }

  const session = await FlowSession.findOne({ _id: sessionId, bot: botId })
    .select('_id bot createdAt lastUpdatedAt')
    .lean();
  if (!session) {
    throw new Error('Chat history not found');
  }

  const metrics = await BotInteractionMetric.find({
    bot: botId,
    flowSession: sessionId,
  })
    .sort({ createdAt: 1 })
    .lean();

  return {
    botId,
    sessionId,
    createdAt: session.createdAt,
    lastUpdatedAt: session.lastUpdatedAt,
    traces: metrics.map(serializeTraceMetric).filter(Boolean),
  };
};

// Get spreadsheet configuration for a bot
exports.getSpreadsheetConfigForBot = async (botId, userId) => {
  const SpreadsheetConfig = require('../models/SpreadsheetConfig');

  logger.info('Fetching spreadsheet configuration', { botId, userId });

  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    throw new Error('Bot not found');
  }

  const config = await SpreadsheetConfig.findOne({ bot: botId });

  if (!config) {
    logger.info('No spreadsheet configuration found for bot', { botId });
    return { configured: false, config: null };
  }

  return {
    configured: config.isConfigured,
    config: {
      fileName: config.fileName,
      sheetName: config.sheetName,
      availableColumns: config.availableColumns,
      outputColumn: config.outputColumn || null,
      inputColumns: config.inputColumns || [],
      rowCount: config.rowCount,
      columnCount: config.columnCount,
    },
  };
};

// Configure spreadsheet columns for a bot
exports.configureSpreadsheetColumns = async (botId, userId, outputColumn, inputColumns) => {
  const SpreadsheetConfig = require('../models/SpreadsheetConfig');

  logger.info('Configuring spreadsheet columns', {
    botId,
    userId,
    outputColumn,
    inputColumnsCount: inputColumns.length,
  });

  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    throw new Error('Bot not found');
  }

  const config = await SpreadsheetConfig.findOneAndUpdate(
    { bot: botId },
    {
      outputColumn,
      inputColumns,
      isConfigured: true,
      updatedAt: new Date(),
    },
    { new: true, runValidators: true },
  );

  if (!config) {
    throw new Error('Spreadsheet configuration not found for this bot');
  }

  logger.info('Spreadsheet columns configured successfully', {
    botId,
    outputColumn,
    inputColumnsCount: inputColumns.length,
  });

  return {
    configured: true,
    config: {
      fileName: config.fileName,
      sheetName: config.sheetName,
      availableColumns: config.availableColumns,
      outputColumn: config.outputColumn,
      inputColumns: config.inputColumns,
      rowCount: config.rowCount,
      columnCount: config.columnCount,
    },
  };
};

// Get Gemini's suggested column configuration
exports.getSuggestedColumnConfigForBot = async (botId, userId) => {
  const SpreadsheetConfig = require('../models/SpreadsheetConfig');
  const { suggestColumnConfiguration } = require('../utils/dataProcessingUtils');

  logger.info('Getting suggested column configuration', { botId, userId });

  const bot = await ChatBot.findOne({ _id: botId, user: userId });
  if (!bot) {
    throw new Error('Bot not found');
  }

  const config = await SpreadsheetConfig.findOne({ bot: botId });

  if (!config) {
    throw new Error('No spreadsheet configuration found for this bot');
  }

  const sheetInfo = {
    columns: config.availableColumns,
    data: config.data,
  };

  const suggestions = await suggestColumnConfiguration(sheetInfo, botId);

  logger.info('Column suggestions retrieved', {
    botId,
    suggestedOutput: suggestions.suggestedOutputColumn,
    suggestedInputsCount: suggestions.suggestedInputColumns.length,
  });

  return {
    suggestions,
    availableColumns: config.availableColumns,
  };
};
