'use strict';

class ChatbotConfiguration {
  constructor({
    avatarConfiguration,
    humanHandoffSettings,
    slackConfiguration,
    llmConfiguration,
    supportedLanguages = ['English'],
    primaryPurpose,
    specialisationArea,
    conversationTone = 'Professional',
    responseStyle = 'Helpful & Detailed',
    targetAudience,
    keyTopics,
    keywords,
    customInstructions,
    requireVisitorEmailVerification = false,
  }) {
    this.avatarConfiguration = avatarConfiguration;
    this.humanHandoffSettings = humanHandoffSettings;
    this.slackConfiguration = slackConfiguration;
    this.llmConfiguration = llmConfiguration;
    this.supportedLanguages = supportedLanguages;
    this.primaryPurpose = primaryPurpose;
    this.specialisationArea = specialisationArea;
    this.conversationTone = conversationTone;
    this.responseStyle = responseStyle;
    this.targetAudience = targetAudience;
    this.keyTopics = keyTopics;
    this.keywords = keywords;
    this.customInstructions = customInstructions;
    this.requireVisitorEmailVerification = requireVisitorEmailVerification;
  }
}

module.exports = ChatbotConfiguration;
