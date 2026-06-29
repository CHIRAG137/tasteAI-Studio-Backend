'use strict';

const ChatbotManagementResponseMapper = {
  toListResponse({ bots, pagination }) {
    return {
      bots: bots.map((bot) => this._sanitizeBot(bot)),
      pagination,
    };
  },

  toDetailResponse(bot) {
    return this._sanitizeBot(bot);
  },

  toUpdateResponse(bot) {
    return this._sanitizeBot(bot);
  },

  toDeleteResponse() {
    return null;
  },

  _sanitizeBot(bot) {
    return {
      _id: bot._id,
      user: bot.user,
      name: bot.name,
      description: bot.description,
      website_url: bot.website_url || null,
      is_voice_enabled: bot.is_voice_enabled || false,
      is_video_bot: bot.is_video_bot || false,
      video_bot_image_url: bot.video_bot_image_url || null,
      video_bot_image_public_id: bot.video_bot_image_public_id || null,
      supported_languages: bot.supported_languages || ['English'],
      primary_purpose: bot.primary_purpose || null,
      specialisation_area: bot.specialisation_area || null,
      conversation_tone: bot.conversation_tone || 'Professional',
      response_style: bot.response_style || 'Helpful & Detailed',
      target_audience: bot.target_audience || null,
      key_topics: bot.key_topics || null,
      keywords: bot.keywords || null,
      custom_instructions: bot.custom_instructions || null,
      conversationFlow: bot.conversationFlow || { nodes: [], edges: [] },
      scraped_urls: bot.scraped_urls || [],
      is_slack_enabled: bot.is_slack_enabled || false,
      slack_channel_id: bot.slack_channel_id || null,
      require_visitor_email_verification: bot.require_visitor_email_verification || false,
      human_handoff_enabled: bot.human_handoff_enabled || false,
      human_handoff_emails: bot.human_handoff_emails || [],
      custom_llm_provider: bot.custom_llm_provider || null,
      custom_model: bot.custom_model || null,
      custom_api_key_source: bot.custom_api_key_source || 'bot',
      training_files: bot.training_files || [],
      createdAt: bot.createdAt || bot.created_at,
      updatedAt: bot.updatedAt || bot.updated_at,
    };
  },
};

module.exports = ChatbotManagementResponseMapper;
