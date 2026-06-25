'use strict';

const Chatbot = require('../../domain/entities/Chatbot');

const ChatbotConfiguration = require('../../domain/valueObjects/ChatbotConfiguration');

const AvatarConfiguration = require('../../domain/valueObjects/AvatarConfiguration');

const HumanHandoffSettings = require('../../domain/valueObjects/HumanHandoffSettings');

const SlackConfiguration = require('../../domain/valueObjects/SlackConfiguration');

const LLMConfiguration = require('../../domain/valueObjects/LLMConfiguration');

class CreateChatbotUseCase {
  constructor({ chatbotCreationOrchestrator }) {
    this.chatbotCreationOrchestrator = chatbotCreationOrchestrator;
  }

  async execute(command) {
    const avatarConfiguration = new AvatarConfiguration({
      isVoiceEnabled: command.isVoiceEnabled,

      isVideoBot: command.isVideoBot,

      avatarUrl: command.avatarUrl,

      avatarPublicId: command.avatarPublicId,
    });

    const humanHandoffSettings = new HumanHandoffSettings({
      enabled: command.humanHandoffEnabled,

      agentEmails: command.humanHandoffEmails,
    });

    const slackConfiguration = new SlackConfiguration({
      enabled: command.isSlackEnabled,

      channelId: command.slackChannelId,
    });

    const llmConfiguration = new LLMConfiguration({
      provider: command.llmProvider,

      model: command.llmModel,

      apiKeySource: command.apiKeySource,

      encryptedApiKey: command.encryptedApiKey,
    });

    const configuration = new ChatbotConfiguration({
      avatarConfiguration,

      humanHandoffSettings,

      slackConfiguration,

      llmConfiguration,

      supportedLanguages: command.supportedLanguages,

      primaryPurpose: command.primaryPurpose,

      specialisationArea: command.specialisationArea,

      conversationTone: command.conversationTone,

      responseStyle: command.responseStyle,

      targetAudience: command.targetAudience,

      keyTopics: command.keyTopics,

      keywords: command.keywords,

      customInstructions: command.customInstructions,
    });

    const chatbot = new Chatbot({
      userId: command.userId,

      name: command.name,

      description: command.description,

      websiteUrl: command.websiteUrl,

      scrapedUrls: command.scrapedUrls,

      trainingFiles: command.files,

      configuration,
    });

    return this.chatbotCreationOrchestrator.create({
      chatbot,
      command,
    });
  }
}

module.exports = CreateChatbotUseCase;
