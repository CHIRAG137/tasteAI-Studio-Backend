'use strict';

const CreateChatbotCommand = require('../../application/dto/CreateChatbotCommand');

const ChatbotResponseMapper = require('../mappers/ChatbotResponseMapper');

class ChatbotCreationController {
  constructor({ createChatbotUseCase, responseBuilder, logger }) {
    this.createChatbotUseCase = createChatbotUseCase;

    this.responseBuilder = responseBuilder;

    this.logger = logger;
  }

  createChatbot = async (req, res) => {
    try {
      const command = new CreateChatbotCommand({
        userId: req.user._id,

        name: req.body.name,

        description: req.body.description,

        websiteUrl: req.body.websiteUrl,

        scrapedUrls: req.body.scrapedUrls || [],

        files: req.files || [],

        supportedLanguages: req.body.supportedLanguages,

        primaryPurpose: req.body.primaryPurpose,

        specialisationArea: req.body.specialisationArea,

        conversationTone: req.body.conversationTone,

        responseStyle: req.body.responseStyle,

        targetAudience: req.body.targetAudience,

        keyTopics: req.body.keyTopics,

        keywords: req.body.keywords,

        customInstructions: req.body.customInstructions,

        isVoiceEnabled: req.body.isVoiceEnabled,

        isVideoBot: req.body.isVideoBot,

        avatarUrl: req.body.avatarUrl,

        avatarPublicId: req.body.avatarPublicId,

        humanHandoffEnabled: req.body.humanHandoffEnabled,

        humanHandoffEmails: req.body.humanHandoffEmails,

        isSlackEnabled: req.body.isSlackEnabled,

        slackChannelId: req.body.slackChannelId,

        llmProvider: req.body.llmProvider,

        llmModel: req.body.llmModel,

        apiKeySource: req.body.apiKeySource,

        encryptedApiKey: req.body.encryptedApiKey,
      });

      const chatbot = await this.createChatbotUseCase.execute(command);

      return this.responseBuilder.created(
        res,
        ChatbotResponseMapper.toCreateResponse(chatbot),
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
