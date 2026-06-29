'use strict';

const ListChatbotsQuery = require('../../application/dto/ListChatbotsQuery');
const GetChatbotQuery = require('../../application/dto/GetChatbotQuery');
const DeleteChatbotCommand = require('../../application/dto/DeleteChatbotCommand');
const UpdateChatbotCommand = require('../../application/dto/UpdateChatbotCommand');
const ChatbotManagementResponseMapper = require('../mappers/ChatbotManagementResponseMapper');

class ChatbotManagementController {
  constructor({ listChatbotsUseCase, getChatbotUseCase, deleteChatbotUseCase, updateChatbotUseCase, responseBuilder, logger }) {
    this.listChatbotsUseCase = listChatbotsUseCase;
    this.getChatbotUseCase = getChatbotUseCase;
    this.deleteChatbotUseCase = deleteChatbotUseCase;
    this.updateChatbotUseCase = updateChatbotUseCase;
    this.responseBuilder = responseBuilder;
    this.logger = logger;
  }

  listChatbots = async (req, res, _next) => {
    try {
      const query = new ListChatbotsQuery({
        userId: req.user.id,
        page: req.query.page,
        limit: req.query.limit,
      });

      const result = await this.listChatbotsUseCase.execute(query);

      return this.responseBuilder.success(
        res,
        ChatbotManagementResponseMapper.toListResponse(result),
        'Chatbots fetched successfully',
      );
    } catch (error) {
      this.logger.error('List chatbots failed', { error: error.message, stack: error.stack });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };

  getChatbot = async (req, res, _next) => {
    try {
      const query = new GetChatbotQuery({ botId: req.params.botId });

      const bot = await this.getChatbotUseCase.execute(query);

      return this.responseBuilder.success(
        res,
        ChatbotManagementResponseMapper.toDetailResponse(bot),
        'Chatbot fetched successfully',
      );
    } catch (error) {
      if (error.statusCode === 404) {
        return this.responseBuilder.notFound(res, null, error.message);
      }
      this.logger.error('Get chatbot failed', { error: error.message, stack: error.stack });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };

  deleteChatbot = async (req, res, _next) => {
    try {
      const command = new DeleteChatbotCommand({
        botId: req.params.botId,
        userId: req.user.id,
      });

      await this.deleteChatbotUseCase.execute(command);

      return this.responseBuilder.success(
        res,
        ChatbotManagementResponseMapper.toDeleteResponse(),
        'Bot and associated data deleted successfully',
      );
    } catch (error) {
      if (error.statusCode === 404) {
        return this.responseBuilder.notFound(res, null, error.message);
      }
      if (error.statusCode === 403) {
        return this.responseBuilder.forbidden(res, null, error.message);
      }
      this.logger.error('Delete chatbot failed', { error: error.message, stack: error.stack });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };

  updateChatbot = async (req, res, _next) => {
    try {
      const command = new UpdateChatbotCommand({
        botId: req.params.botId,
        userId: req.user.id,
        name: req.body.name,
        description: req.body.description,
        websiteUrl: req.body.website_url || req.body.websiteUrl,
        scrapedUrls: req.body.scraped_urls || req.body.scrapedUrls,
        conversationFlow: req.body.conversationFlow,
        supportedLanguages: req.body.supported_languages || req.body.supportedLanguages,
        primaryPurpose: req.body.primary_purpose || req.body.primaryPurpose,
        specialisationArea: req.body.specialisation_area || req.body.specialisationArea,
        conversationTone: req.body.conversation_tone || req.body.conversationTone,
        responseStyle: req.body.response_style || req.body.responseStyle,
        targetAudience: req.body.target_audience || req.body.targetAudience,
        keyTopics: req.body.key_topics || req.body.keyTopics,
        keywords: req.body.keywords,
        customInstructions: req.body.custom_instructions || req.body.customInstructions,
        isVoiceEnabled: req.body.is_voice_enabled !== undefined ? req.body.is_voice_enabled : req.body.isVoiceEnabled,
        isVideoBot: req.body.is_video_bot !== undefined ? req.body.is_video_bot : req.body.isVideoBot,
        avatarUrl: req.body.video_bot_image_url || req.body.avatarUrl,
        avatarPublicId: req.body.video_bot_image_public_id || req.body.avatarPublicId,
        humanHandoffEnabled: req.body.human_handoff_enabled !== undefined ? req.body.human_handoff_enabled : req.body.humanHandoffEnabled,
        humanHandoffEmails: req.body.human_handoff_emails || req.body.humanHandoffEmails,
        requireVisitorEmailVerification: req.body.require_visitor_email_verification !== undefined
          ? req.body.require_visitor_email_verification
          : req.body.requireVisitorEmailVerification,
        isSlackEnabled: req.body.is_slack_enabled !== undefined ? req.body.is_slack_enabled : req.body.isSlackEnabled,
        slackChannelId: req.body.slack_channel_id || req.body.slackChannelId,
        llmProvider: req.body.custom_llm_provider || req.body.llmProvider,
        llmModel: req.body.custom_model || req.body.llmModel,
        apiKeySource: req.body.custom_api_key_source || req.body.apiKeySource,
        customApiKey: req.body.custom_api_key || req.body.customApiKey,
      });

      const updatedBot = await this.updateChatbotUseCase.execute(command);

      return this.responseBuilder.success(
        res,
        ChatbotManagementResponseMapper.toUpdateResponse(updatedBot),
        'Bot updated successfully',
      );
    } catch (error) {
      if (error.statusCode === 404) {
        return this.responseBuilder.notFound(res, null, error.message);
      }
      if (error.statusCode === 403) {
        return this.responseBuilder.forbidden(res, null, error.message);
      }
      this.logger.error('Update chatbot failed', { error: error.message, stack: error.stack });
      return this.responseBuilder.internalError(res, null, error.message);
    }
  };
}

module.exports = ChatbotManagementController;
