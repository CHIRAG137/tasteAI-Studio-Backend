const mongoose = require("mongoose");

const customizationSchema = new mongoose.Schema({
  botId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatBot",
    required: true,
    unique: true,
  },
  welcomeMessage: String,
  headerTitle: String,
  headerSubtitle: String,
  placeholder: String,
  primaryColor: String,
  backgroundColor: String,
  headerBackground: String,
  userMessageColor: String,
  botMessageColor: String,
  textColor: String,
  fontFamily: String,
  borderRadius: Number,
}, { timestamps: true });

module.exports = mongoose.model("Customization", customizationSchema);
