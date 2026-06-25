'use strict';

const ChatbotResponseMapper = {
  toCreateResponse(chatbot) {
    return {
      id: chatbot._id || chatbot.id,

      name: chatbot.name,

      description: chatbot.description,

      websiteUrl: chatbot.website_url,

      isVoiceEnabled: chatbot.is_voice_enabled,

      isVideoBot: chatbot.is_video_bot,

      humanHandoffEnabled: chatbot.human_handoff_enabled,

      isSlackEnabled: chatbot.is_slack_enabled,

      createdAt: chatbot.createdAt,

      updatedAt: chatbot.updatedAt,
    };
  },
};

module.exports = ChatbotResponseMapper;
