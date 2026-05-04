const mongoose = require('mongoose');

const ChatBotSchema = new mongoose.Schema(
  {
    // user who created the bot
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // name of the bot
    name: String,
    
    // website url which is used as data source for bot training
    website_url: String,
    
    // description of the bot
    description: String,
    
    // flag to check if user wants to enable voice for the bot(i.e. user can ask a query by speaking)
    is_voice_enabled: { type: Boolean, default: false },
    
    // flag to check if the user wants to enable the bot for slack
    is_slack_enabled: { type: Boolean, default: false },
    
    // slack channel id in which the bot will be enabled if is_slack_enabled is set to true 
    slack_channel_id: String,
    
    // languages the bot supports
    supported_languages: { type: [String], default: ['English'] },
    
    // primary purpose of the bot
    primary_purpose: String,
    
    // specialisation area of the bot
    specialisation_area: String,
    
    // conversation tone of the bot
    conversation_tone: { type: String, default: 'Professional' },
    
    // response style of the bot
    response_style: { type: String, default: 'Helpful & Detailed' },
    
    // target audience of the bot
    target_audience: String,
    
    // key topics of the bot
    key_topics: String,
    
    // keywords for better training of the bot
    keywords: String,
    
    // custom instructions(if any to be given to the bot)
    custom_instructions: String,
    
    // conversational flow(a sequential flow the bot follows at the starting of the chat)
    conversationFlow: { type: mongoose.Schema.Types.Mixed, default: { nodes: [], edges: [] } },
    
    // scraped urls(the subpage urls based on the website url that we scraped for training the bot)
    scraped_urls: { type: [String], default: [] },
    
    // flag to include the video avatar in the chatbot
    is_video_bot: { type: Boolean, default: false },
    
    // cloudinary url of the human avatar image that user uploaded that appears on the bot
    video_bot_image_url: String,
    
    // cloudinary id of the human avatar image that user uploaded that appears on the bot
    video_bot_image_public_id: String,
        
    // flag to enabled human handoff(if user wants to enabled human intervention in chatbot)
    human_handoff_enabled: { type: Boolean, default: false },
    
    // emails of the person who act as agents to respond to user query if human_handoff_enabled is enabled 
    human_handoff_emails: { type: [String], default: [] },

    // when true, visitors must sign in with Auth0 before chatting (public/embed)
    require_visitor_auth0_identity: { type: Boolean, default: false },

    // custom LLM provider selected by user ('gemini' or 'openai')
    custom_llm_provider: { type: String, enum: ['gemini', 'openai'], default: null },

    // encrypted API key for custom LLM provider
    // Contains: { encrypted, iv, authTag }
    encrypted_api_key: { type: mongoose.Schema.Types.Mixed, default: null },

    // custom model name selected by user (e.g., 'gpt-4', 'gemini-pro')
    custom_model: { type: String, default: null },

    // persisted training files for the bot
    training_files: [
      {
        originalname: String,
        mimeType: String,
        size: Number,
        hash: String,
        path: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatBot', ChatBotSchema);
