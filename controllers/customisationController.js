const Customization = require("../models/Customisation");

exports.getCustomization = async (req, res) => {
  try {
    const { botId } = req.params;
    const customization = await Customization.findOne({ botId });
    return res.status(200).json({ customization });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch customization" });
  }
};

exports.saveCustomization = async (req, res) => {
  try {
    const { botId } = req.params;
    const data = req.body;

    const customization = await Customization.findOneAndUpdate(
      { botId },
      { ...data, botId },
      { new: true, upsert: true }
    );

    return res.status(200).json({ customization });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save customization" });
  }
};
