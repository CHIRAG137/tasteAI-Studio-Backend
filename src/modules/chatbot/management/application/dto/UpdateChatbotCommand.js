'use strict';

class UpdateChatbotCommand {
  constructor({
    botId,
    userId,
    name,
    description,
    websiteUrl,
    scrapedUrls,
    conversationFlow,
    supportedLanguages,
    primaryPurpose,
    specialisationArea,
    conversationTone,
    responseStyle,
    targetAudience,
    keyTopics,
    keywords,
    customInstructions,
    isVoiceEnabled,
    isVideoBot,
    avatarUrl,
    avatarPublicId,
    humanHandoffEnabled,
    humanHandoffEmails,
    requireVisitorEmailVerification,
    isSlackEnabled,
    slackChannelId,
    llmProvider,
    llmModel,
    apiKeySource,
    customApiKey,
  }) {
    this.botId = botId;
    this.userId = userId;
    this.name = name;
    this.description = description;
    this.websiteUrl = websiteUrl;
    this.scrapedUrls = scrapedUrls;
    this.conversationFlow = conversationFlow;
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
    this.validate();
  }

  validate() {
    if (!this.botId) {
      throw new Error('Bot id is required');
    }
    if (!this.userId) {
      throw new Error('User id is required');
    }
    if (this.llmProvider && !['gemini', 'openai', 'gemma'].includes(this.llmProvider)) {
      throw new Error('Invalid llmProvider. Must be "gemini", "openai", or "gemma"');
    }
    if (this.apiKeySource && !['bot', 'user'].includes(this.apiKeySource)) {
      throw new Error('Invalid apiKeySource. Must be "bot" or "user"');
    }
  }

  toUpdatePayload(encryptionService) {
    const payload = {};

    if (this.name !== undefined) payload.name = this.name;
    if (this.description !== undefined) payload.description = this.description;
    if (this.websiteUrl !== undefined) payload.website_url = this.websiteUrl;
    if (this.scrapedUrls !== undefined) payload.scraped_urls = this.scrapedUrls;
    if (this.conversationFlow !== undefined) payload.conversationFlow = this.conversationFlow;
    if (this.supportedLanguages !== undefined) payload.supported_languages = this.supportedLanguages;
    if (this.primaryPurpose !== undefined) payload.primary_purpose = this.primaryPurpose;
    if (this.specialisationArea !== undefined) payload.specialisation_area = this.specialisationArea;
    if (this.conversationTone !== undefined) payload.conversation_tone = this.conversationTone;
    if (this.responseStyle !== undefined) payload.response_style = this.responseStyle;
    if (this.targetAudience !== undefined) payload.target_audience = this.targetAudience;
    if (this.keyTopics !== undefined) payload.key_topics = this.keyTopics;
    if (this.keywords !== undefined) payload.keywords = this.keywords;
    if (this.customInstructions !== undefined) payload.custom_instructions = this.customInstructions;
    if (this.isVoiceEnabled !== undefined) payload.is_voice_enabled = this.isVoiceEnabled;
    if (this.isVideoBot !== undefined) payload.is_video_bot = this.isVideoBot;
    if (this.avatarUrl !== undefined) payload.video_bot_image_url = this.avatarUrl;
    if (this.avatarPublicId !== undefined) payload.video_bot_image_public_id = this.avatarPublicId;
    if (this.humanHandoffEnabled !== undefined) payload.human_handoff_enabled = this.humanHandoffEnabled;
    if (this.humanHandoffEmails !== undefined) payload.human_handoff_emails = this.humanHandoffEmails;
    if (this.requireVisitorEmailVerification !== undefined) {
      payload.require_visitor_email_verification = this.requireVisitorEmailVerification;
    }
    if (this.isSlackEnabled !== undefined) payload.is_slack_enabled = this.isSlackEnabled;
    if (this.slackChannelId !== undefined) payload.slack_channel_id = this.slackChannelId;
    if (this.llmProvider !== undefined) payload.custom_llm_provider = this.llmProvider;
    if (this.llmModel !== undefined) payload.custom_model = this.llmModel;
    if (this.apiKeySource !== undefined) payload.custom_api_key_source = this.apiKeySource;

    if (this.customApiKey !== undefined && this.apiKeySource === 'bot') {
      payload.encrypted_api_key = encryptionService.encrypt(this.customApiKey);
    }

    return payload;
  }
}

module.exports = UpdateChatbotCommand;
