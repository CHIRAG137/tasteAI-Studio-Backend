const ChatBot = require("../models/ChatBot");
const QAHistory = require("../models/QAHistory");
const Customization = require("../models/Customisation");

exports.getAllChatBots = async (req, res) => {
  try {
    const bots = await ChatBot.find();
    res.status(200).json({ success: true, bots });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bots", error });
  }
};

exports.getBotById = async (req, res) => {
  try {
    const bot = await ChatBot.findById(req.params.botId);
    if (!bot) return res.status(404).json({ message: "Bot not found" });
    res.json(bot);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteBot = async (req, res) => {
  const { botId } = req.params;

  try {
    const bot = await ChatBot.findById(botId);
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
    const bot = await ChatBot.findById(botId);
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
    } = req.body;

    bot.name = name || bot.name;
    bot.website_url = website_url || bot.website_url;
    bot.description = description || bot.description;
    bot.is_voice_enabled = is_voice_enabled === "true";
    bot.is_auto_translate = is_auto_translate === "true";
    bot.supported_languages = supported_languages
      ? JSON.parse(supported_languages)
      : bot.supported_languages;
    bot.primary_purpose = primary_purpose || bot.primary_purpose;
    bot.specialisation_area = specialisation_area || bot.specialisation_area;
    bot.conversation_tone = conversation_tone || bot.conversation_tone;
    bot.response_style = response_style || bot.response_style;
    bot.target_audience = target_audience || bot.target_audience;
    bot.key_topics = key_topics || bot.key_topics;
    bot.keywords = keywords || bot.keywords;
    bot.custom_instructions = custom_instructions || bot.custom_instructions;

    // Optional: handle file (currently just logging)
    if (req.file) {
      console.log("File received:", req.file.originalname);
      // Save or process file here if needed
    }

    await bot.save();

    return res.status(200).json({
      success: true,
      message: "Bot updated successfully",
      bot,
    });
  } catch (error) {
    console.error("Error updating bot:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
