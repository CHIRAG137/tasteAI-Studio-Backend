const ChatBot = require("../models/ChatBot");

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
