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
  }

  toPersistence() {
    return {
      is_voice_enabled: this.avatarConfiguration.isVoiceEnabled,

      is_video_bot: this.avatarConfiguration.isVideoBot,
      video_bot_image_url: this.avatarConfiguration.avatarUrl,
      video_bot_image_public_id: this.avatarConfiguration.avatarPublicId,

      human_handoff_enabled: this.humanHandoffSettings.enabled,

      human_handoff_emails: this.humanHandoffSettings.agentEmails,

      is_slack_enabled: this.slackConfiguration.enabled,

      slack_channel_id: this.slackConfiguration.channelId,

      supported_languages: this.supportedLanguages,

      primary_purpose: this.primaryPurpose,

      specialisation_area: this.specialisationArea,

      conversation_tone: this.conversationTone,

      response_style: this.responseStyle,

      target_audience: this.targetAudience,

      key_topics: this.keyTopics,

      keywords: this.keywords,

      custom_instructions: this.customInstructions,

      custom_llm_provider: this.llmConfiguration.provider,

      custom_api_key_source: this.llmConfiguration.apiKeySource,

      encrypted_api_key: this.llmConfiguration.encryptedApiKey,

      custom_model: this.llmConfiguration.model,
    };
  }
}

module.exports = ChatbotConfiguration;
