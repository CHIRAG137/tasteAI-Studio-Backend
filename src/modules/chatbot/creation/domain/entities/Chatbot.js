'use strict';

class Chatbot {
  constructor({
    id = null,

    userId,

    name,
    description,

    websiteUrl,

    scrapedUrls = [],

    trainingFiles = [],

    configuration,
  }) {
    this.id = id;

    this.userId = userId;

    this.name = name;
    this.description = description;

    this.websiteUrl = websiteUrl;

    this.scrapedUrls = scrapedUrls;

    this.trainingFiles = trainingFiles;

    this.configuration = configuration;

    this.validate();
  }

  validate() {
    if (!this.userId) {
      throw new Error('User id is required');
    }

    if (!this.name?.trim()) {
      throw new Error('Bot name is required');
    }
  }

  toPersistence() {
    return {
      user: this.userId,

      name: this.name,

      description: this.description,

      website_url: this.websiteUrl,

      scraped_urls: this.scrapedUrls,

      training_files: this.trainingFiles,

      is_voice_enabled: this.configuration.avatarConfiguration.isVoiceEnabled,

      is_video_bot: this.configuration.avatarConfiguration.isVideoBot,

      video_bot_image_url: this.configuration.avatarConfiguration.avatarUrl,

      video_bot_image_public_id: this.configuration.avatarConfiguration.avatarPublicId,

      human_handoff_enabled: this.configuration.humanHandoffSettings.enabled,

      human_handoff_emails: this.configuration.humanHandoffSettings.agentEmails,

      is_slack_enabled: this.configuration.slackConfiguration.enabled,

      slack_channel_id: this.configuration.slackConfiguration.channelId,

      custom_llm_provider: this.configuration.llmConfiguration.provider,

      custom_model: this.configuration.llmConfiguration.model,

      custom_api_key_source: this.configuration.llmConfiguration.apiKeySource,

      encrypted_api_key: this.configuration.llmConfiguration.encryptedApiKey,

      supported_languages: this.configuration.supportedLanguages,

      primary_purpose: this.configuration.primaryPurpose,

      specialisation_area: this.configuration.specialisationArea,

      conversation_tone: this.configuration.conversationTone,

      response_style: this.configuration.responseStyle,

      target_audience: this.configuration.targetAudience,

      key_topics: this.configuration.keyTopics,

      keywords: this.configuration.keywords,

      custom_instructions: this.configuration.customInstructions,
    };
  }

  static fromPersistence(document) {
    return new Chatbot({
      id: document._id,

      userId: document.user,

      name: document.name,

      description: document.description,

      websiteUrl: document.website_url,

      scrapedUrls: document.scraped_urls,

      trainingFiles: document.training_files,

      configuration: null,
    });
  }
}

module.exports = Chatbot;
