'use strict';

const ChatbotResponseMapper = {
  toCreateResponse({ message, chatbot, scrapedContent, files, totalQAs, integrations, meta }) {
    return {
      bot_id: chatbot._id || chatbot.id,
      message,

      bot: {
        name: chatbot.name,
        description: chatbot.description,
        website_url: chatbot.website_url || null,
        is_voice_enabled: chatbot.is_voice_enabled || false,
        is_video_bot: chatbot.is_video_bot || false,
        video_bot_image_url: chatbot.video_bot_image_url || null,
        supported_languages: chatbot.supported_languages || ['English'],
        primary_purpose: chatbot.primary_purpose || null,
        specialisation_area: chatbot.specialisation_area || null,
        conversation_tone: chatbot.conversation_tone || 'Professional',
        response_style: chatbot.response_style || 'Helpful & Detailed',
        target_audience: chatbot.target_audience || null,
        key_topics: chatbot.key_topics || null,
        keywords: chatbot.keywords || null,
      },

      integrations: {
        slack: {
          enabled: integrations.slack.enabled,
          channel_id: integrations.slack.channelId,
          connected: integrations.slack.connected || false,
        },
        human_handoff: {
          enabled: integrations.humanHandoff.enabled,
          agents_count: integrations.humanHandoff.agentCount,
          agent_emails: integrations.humanHandoff.agentEmails,
        },
      },

      training_summary: {
        scraped_pages: scrapedContent?.pages || 0,
        markdown_qas: scrapedContent?.qas || 0,
        files_uploaded: files?.uploaded || false,
        files_count: files?.count || 0,
        file_qas: files?.qas || 0,
        total_qas: totalQAs || 0,
      },

      meta: {
        created_at: chatbot.createdAt || chatbot.created_at,
        created_by: meta.createdBy,
      },
    };
  },
};

module.exports = ChatbotResponseMapper;
