'use strict';

const CreateChatbotCommand = require('../../application/dto/CreateChatbotCommand');
const ChatbotResponseMapper = require('../mappers/ChatbotResponseMapper');

class ChatbotCreationController {
  constructor({ createChatbotUseCase, responseBuilder, logger }) {
    this.createChatbotUseCase = createChatbotUseCase;
    this.responseBuilder = responseBuilder;
    this.logger = logger;
  }

  _parseSupportedLanguages(value) {
    if (!value) {
      return ['English'];
    }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // not JSON
    }
    if (typeof value === 'string') {
      return value.split(',').map((l) => l.trim());
    }
    return Array.isArray(value) ? value : ['English'];
  }

  _parseArrayField(value) {
    if (!value) {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return typeof value === 'string' ? [value] : [];
    }
  }

  _parseConversationFlow(value) {
    if (!value) {
      return { nodes: [], edges: [] };
    }
    if (typeof value === 'object') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return { nodes: [], edges: [] };
    }
  }

  _parseScrapedContent(value) {
    if (!value) {
      return [];
    }
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  _parseBoolean(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return false;
  }

  createChatbot = async (req, res, _next) => {
    try {
      const command = new CreateChatbotCommand({
        userId: req.user.id,

        name: req.body.name,
        description: req.body.description,

        websiteUrl: req.body.website_url || req.body.websiteUrl,

        scrapedUrls: this._parseArrayField(req.body.scraped_urls || req.body.scrapedUrls),
        scrapedContent: this._parseScrapedContent(
          req.body.scraped_content || req.body.scrapedContent,
        ),

        files: req.files || [],

        supportedLanguages: this._parseSupportedLanguages(
          req.body.supported_languages || req.body.supportedLanguages,
        ),

        primaryPurpose: req.body.primary_purpose || req.body.primaryPurpose,
        specialisationArea: req.body.specialisation_area || req.body.specialisationArea,
        conversationTone: req.body.conversation_tone || req.body.conversationTone,
        responseStyle: req.body.response_style || req.body.responseStyle,
        targetAudience: req.body.target_audience || req.body.targetAudience,
        keyTopics: req.body.key_topics || req.body.keyTopics,
        keywords: req.body.keywords,
        customInstructions: req.body.custom_instructions || req.body.customInstructions,

        conversationFlow: this._parseConversationFlow(req.body.conversationFlow),

        requireVisitorEmailVerification: this._parseBoolean(
          req.body.require_visitor_email_verification ?? req.body.requireVisitorEmailVerification,
        ),

        isVoiceEnabled: this._parseBoolean(req.body.is_voice_enabled ?? req.body.isVoiceEnabled),

        isVideoBot: this._parseBoolean(req.body.is_video_bot ?? req.body.isVideoBot),
        avatarUrl: req.body.video_bot_image_url || req.body.avatarUrl,
        avatarPublicId: req.body.video_bot_image_public_id || req.body.avatarPublicId,

        humanHandoffEnabled: this._parseBoolean(
          req.body.human_handoff_enabled ?? req.body.humanHandoffEnabled,
        ),
        humanHandoffEmails: this._parseArrayField(
          req.body.human_handoff_emails || req.body.humanHandoffEmails,
        ),

        isSlackEnabled: this._parseBoolean(req.body.is_slack_enabled ?? req.body.isSlackEnabled),
        slackChannelId: req.body.slack_channel_id || req.body.slackChannelId,

        llmProvider: req.body.custom_llm_provider || req.body.llmProvider,
        llmModel: req.body.custom_model || req.body.llmModel,
        apiKeySource: req.body.custom_api_key_source || req.body.apiKeySource || 'user',
        customApiKey: req.body.custom_api_key || req.body.customApiKey,
      });

      const result = await this.createChatbotUseCase.execute(command);

      return this.responseBuilder.created(
        res,
        ChatbotResponseMapper.toCreateResponse(result),
        'Chatbot created successfully',
      );
    } catch (error) {
      this.logger.error('Create chatbot failed', {
        error: error.message,
        stack: error.stack,
      });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };
}

module.exports = ChatbotCreationController;
