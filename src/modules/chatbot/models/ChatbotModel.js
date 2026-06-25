'use strict';

const mongoose = require('mongoose');

const ChatBotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    name: String,

    website_url: String,

    description: String,

    is_voice_enabled: {
      type: Boolean,
      default: false,
    },

    is_slack_enabled: {
      type: Boolean,
      default: false,
    },

    require_visitor_email_verification: {
      type: Boolean,
      default: false,
    },

    slack_channel_id: String,

    supported_languages: {
      type: [String],
      default: ['English'],
    },

    primary_purpose: String,

    specialisation_area: String,

    conversation_tone: {
      type: String,
      default: 'Professional',
    },

    response_style: {
      type: String,
      default: 'Helpful & Detailed',
    },

    target_audience: String,

    key_topics: String,

    keywords: String,

    custom_instructions: String,

    conversationFlow: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        nodes: [],
        edges: [],
      },
    },

    scraped_urls: {
      type: [String],
      default: [],
    },

    is_video_bot: {
      type: Boolean,
      default: false,
    },

    video_bot_image_url: String,

    video_bot_image_public_id: String,

    human_handoff_enabled: {
      type: Boolean,
      default: false,
    },

    human_handoff_emails: {
      type: [String],
      default: [],
    },

    custom_llm_provider: {
      type: String,
      enum: ['gemini', 'openai', 'gemma'],
      default: null,
    },

    custom_api_key_source: {
      type: String,
      enum: ['bot', 'user'],
      default: 'bot',
    },

    encrypted_api_key: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    custom_model: {
      type: String,
      default: null,
    },

    training_files: [
      {
        originalname: String,
        mimeType: String,
        size: Number,
        hash: String,
        path: String,

        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('ChatBot', ChatBotSchema);
