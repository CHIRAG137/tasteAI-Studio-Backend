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
  const updateData = req.body;

  try {
    const bot = await ChatBot.findById(botId);
    if (!bot) {
      return res.status(404).json({ success: false, message: "Bot not found" });
    }

    // Update allowed fields
    Object.keys(updateData).forEach((key) => {
      if (key in bot) {
        bot[key] = updateData[key];
      }
    });

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
