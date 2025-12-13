const elevenlabsService = require("../services/elevenlabsService");
const logger = require("../utils/logger");
const responseBuilder = require("../utils/responseBuilder");

exports.textToSpeech = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      logger.warn("Text missing for TTS request");
      return responseBuilder.badRequest(res, null, "Text is required");
    }

    const audioBuffer = await elevenlabsService.textToSpeech(text);
    logger.info("Text-to-speech conversion successful", {
      textSnippet: text.slice(0, 30),
    });

    res.setHeader("Content-Type", "audio/mpeg");

    return res.send(audioBuffer);
  } catch (err) {
    logger.error("Text-to-speech conversion failed", { error: err.message });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.speechToText = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn("Audio file missing for STT request");
      return responseBuilder.badRequest(res, null, "Audio file is required");
    }

    const audioBuffer = req.file.buffer;

    const text = await elevenlabsService.speechToText(audioBuffer);

    logger.info("Speech-to-text conversion successful");

    return responseBuilder.ok(res, { text }, "Transcription successful");
  } catch (err) {
    console.error(err.response?.data || err.message);
    logger.error("Speech-to-text conversion failed", {
      error: err.response?.data || err.message,
    });
    return responseBuilder.internalError(res, null, err.message);
  }
};
