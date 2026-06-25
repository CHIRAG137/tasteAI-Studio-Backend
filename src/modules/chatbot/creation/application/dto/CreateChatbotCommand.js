'use strict';

class CreateChatbotCommand {
  constructor({
    userId,
    name,
    description,
    websiteUrl,
    scrapedUrls = [],
    scrapedContent = [],
    conversationFlow = { nodes: [], edges: [] },
    files = [],
    supportedLanguages = ['English'],
    primaryPurpose,
    specialisationArea,
    conversationTone,
    responseStyle,
    targetAudience,
    keyTopics,
    keywords,
    customInstructions,
    isVoiceEnabled = false,
    isVideoBot = false,
    avatarUrl = null,
    avatarPublicId = null,
    humanHandoffEnabled = false,
    humanHandoffEmails = [],
    requireVisitorEmailVerification = false,
    isSlackEnabled = false,
    slackChannelId = null,
    llmProvider = null,
    llmModel = null,
    apiKeySource = 'user',
    customApiKey = null,
    encryptedApiKey = null,
  }) {
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.websiteUrl = websiteUrl;
    this.scrapedUrls = scrapedUrls;
    this.scrapedContent = scrapedContent;
    this.conversationFlow = conversationFlow;
    this.files = files;
    this.supportedLanguages = supportedLanguages;
    this.primaryPurpose = primaryPurpose;
    this.specialisationArea = specialisationArea;
    this.conversationTone = conversationTone;
    this.responseStyle = responseStyle;
    this.targetAudience = targetAudience;
    this.keyTopics = keyTopics;
    this.keywords = keywords;
    this.customInstructions = customInstructions;
    this.isVoiceEnabled = isVoiceEnabled;
    this.isVideoBot = isVideoBot;
    this.avatarUrl = avatarUrl;
    this.avatarPublicId = avatarPublicId;
    this.humanHandoffEnabled = humanHandoffEnabled;
    this.humanHandoffEmails = humanHandoffEmails;
    this.requireVisitorEmailVerification = requireVisitorEmailVerification;
    this.isSlackEnabled = isSlackEnabled;
    this.slackChannelId = slackChannelId;
    this.llmProvider = llmProvider;
    this.llmModel = llmModel;
    this.apiKeySource = apiKeySource;
    this.customApiKey = customApiKey;
    this.encryptedApiKey = encryptedApiKey;
    this.validate();
  }

  validate() {
    if (!this.userId) {
      throw new Error('User id is required');
    }
    if (!this.name?.trim()) {
      throw new Error('Bot name is required');
    }
    if (this.llmProvider && !['gemini', 'openai', 'gemma'].includes(this.llmProvider)) {
      throw new Error('Invalid llmProvider. Must be "gemini", "openai", or "gemma"');
    }
    if (this.apiKeySource && !['bot', 'user'].includes(this.apiKeySource)) {
      throw new Error('Invalid apiKeySource. Must be "bot" or "user"');
    }
  }
}

module.exports = CreateChatbotCommand;
