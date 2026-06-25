'use strict';

const Chatbot = require('../../domain/entities/Chatbot');
const ChatbotConfiguration = require('../../domain/valueObjects/ChatbotConfiguration');
const AvatarConfiguration = require('../../domain/valueObjects/AvatarConfiguration');
const HumanHandoffSettings = require('../../domain/valueObjects/HumanHandoffSettings');
const SlackConfiguration = require('../../domain/valueObjects/SlackConfiguration');
const LLMConfiguration = require('../../domain/valueObjects/LLMConfiguration');

class CreateChatbotUseCase {
  constructor({ chatbotCreationOrchestrator, encryptionService }) {
    this.chatbotCreationOrchestrator = chatbotCreationOrchestrator;
    this.encryptionService = encryptionService;
  }

  async execute(command) {
    let encryptedApiKey = command.encryptedApiKey;

    if (command.llmProvider && command.apiKeySource === 'bot') {
      if (!command.customApiKey) {
        throw new Error('API key is required when apiKeySource is "bot"');
      }
      try {
        encryptedApiKey = this.encryptionService.encrypt(command.customApiKey);
      } catch {
        throw new Error('Failed to encrypt API key');
      }
    }

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
      encryptedApiKey,
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
      requireVisitorEmailVerification: command.requireVisitorEmailVerification,
    });

    const chatbot = new Chatbot({
      userId: command.userId,
      name: command.name,
      description: command.description,
      websiteUrl: command.websiteUrl,
      scrapedUrls: command.scrapedUrls,
      conversationFlow: command.conversationFlow,
      trainingFiles: [],
      configuration,
    });

    return this.chatbotCreationOrchestrator.create({
      chatbot,
      command,
    });
  }
}

module.exports = CreateChatbotUseCase;
