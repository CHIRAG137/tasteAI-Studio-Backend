const ChatBot = require("../models/ChatBot");
const QAHistory = require("../models/QAHistory");
const Customization = require("../models/Customisation");

exports.getAllChatBots = async (req, res) => {
  try {
    const bots = await ChatBot.find({ user: req.user.id });
    res.status(200).json({ success: true, bots });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bots", error });
  }
};

exports.getBotById = async (req, res) => {
  try {
    const bot = await ChatBot.findById({
      _id: req.params.botId
    });
    if (!bot) return res.status(404).json({ message: "Bot not found" });
    res.json(bot);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteBot = async (req, res) => {
  const { botId } = req.params;

  try {
    const bot = await ChatBot.findById({ _id: botId, user: req.user.id });
    if (!bot) {
      return res.status(404).json({ success: false, message: "Bot not found" });
    }

    // Delete related customization
    await Customization.findOneAndDelete({ botId });

    // Delete related QA history
    await QAHistory.deleteMany({ bot: botId });

    // Delete the bot itself
    await ChatBot.findByIdAndDelete(botId);

    return res.status(200).json({
      success: true,
      message: "Bot and associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bot:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.updateBot = async (req, res) => {
  const { botId } = req.params;

  try {
    const bot = await ChatBot.findOne({ _id: botId, user: req.user.id });
    if (!bot) {
      return res.status(404).json({ success: false, message: "Bot not found" });
    }

    const {
      name,
      website_url,
      description,
      is_voice_enabled,
      is_auto_translate,
      supported_languages,
      primary_purpose,
      specialisation_area,
      conversation_tone,
      response_style,
      target_audience,
      key_topics,
      keywords,
      custom_instructions,
      is_slack_enabled,
      slack_command,
      slack_channel_id,
      conversationFlow,
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        error: "Missing required fields: name, or description",
      });
    }

    // 🔹 Parse supported languages
    let parsedLanguages;
    try {
      parsedLanguages = JSON.parse(supported_languages);
      if (!Array.isArray(parsedLanguages)) throw new Error("Not an array");
    } catch {
      parsedLanguages = supported_languages
        ?.split(",")
        .map((lang) => lang.trim());
    }

    // 🔹 Parse conversation flow
    let parsedConversationFlow = conversationFlow;
    if (typeof conversationFlow === "string") {
      try {
        parsedConversationFlow = JSON.parse(conversationFlow);
      } catch {
        parsedConversationFlow = { nodes: [], edges: [] };
      }
    }

    // 🔹 Update fields
    bot.name = name || bot.name;
    bot.website_url = website_url || bot.website_url;
    bot.description = description || bot.description;
    bot.is_voice_enabled = is_voice_enabled === "true";
    bot.is_auto_translate = is_auto_translate === "true";
    bot.is_slack_enabled = is_slack_enabled === "true";
    bot.slack_command = slack_command || bot.slack_command;
    bot.slack_channel_id = slack_channel_id || bot.slack_channel_id;
    bot.supported_languages = parsedLanguages || bot.supported_languages;
    bot.primary_purpose = primary_purpose || bot.primary_purpose;
    bot.specialisation_area = specialisation_area || bot.specialisation_area;
    bot.conversation_tone = conversation_tone || bot.conversation_tone;
    bot.response_style = response_style || bot.response_style;
    bot.target_audience = target_audience || bot.target_audience;
    bot.key_topics = key_topics || bot.key_topics;
    bot.keywords = keywords || bot.keywords;
    bot.custom_instructions = custom_instructions || bot.custom_instructions;
    bot.conversationFlow = parsedConversationFlow || bot.conversationFlow;

    // 🔹 Auto-join Slack channel if enabled
    if (is_slack_enabled === "true" && slack_channel_id) {
      const slackIntegration = await SlackIntegration.findOne({
        userId: req.user.id,
      });

      if (slackIntegration?.slackAccessToken) {
        try {
          await axios.post(
            "https://slack.com/api/conversations.join",
            { channel: slack_channel_id },
            {
              headers: {
                Authorization: `Bearer ${slackIntegration.slackAccessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log(`Bot joined Slack channel ${slack_channel_id}`);
        } catch (err) {
          console.error(
            "Error joining Slack channel:",
            err.response?.data || err.message
          );
        }
      } else {
        console.warn(
          "Slack integration not found for user. Bot not added to channel."
        );
      }
    }

    // 🔹 Process uploaded PDF (if present)
    if (req.file) {
      // First delete all previous QAs for this bot
      await QAHistory.deleteMany({ bot: bot._id });

      const text = await extractTextFromPDF(req.file.path);
      if (text && text.trim()) {
        const chunks = text.match(/.{1,3000}/g);
        for (const chunk of chunks) {
          const qas = await generateQAsViaGPT(chunk, name, description);
          for (const qa of qas) {
            const { question, answer } = qa;
            if (question && answer) {
              const embedding = await embedText(question);
              await QAHistory.create({
                bot: bot._id,
                question,
                answer,
                embedding: Buffer.from(embedding.buffer),
              });
            }
          }
        }
      }
    }

    await bot.save();

    return res.status(200).json({
      success: true,
      message:
        "Bot updated successfully. Previous QAs replaced with new ones (if file uploaded) and added to Slack channel (if enabled).",
      bot,
    });
  } catch (error) {
    console.error("Error updating bot:", error.response?.data || error.message);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
