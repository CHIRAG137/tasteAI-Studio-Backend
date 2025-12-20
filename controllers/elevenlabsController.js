const elevenlabsService = require('../services/elevenlabsService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

exports.textToSpeech = async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      logger.warn('Text missing for TTS request');
      return responseBuilder.badRequest(res, null, 'Text is required');
    }

    if (!voiceId) {
      logger.warn('Voice Id missing for TTS request');
      return responseBuilder.badRequest(res, null, 'Voice Id is required');
    }

    const audioBuffer = await elevenlabsService.textToSpeech(text, voiceId);
    logger.info('Text-to-speech conversion successful', {
      textSnippet: text.slice(0, 30),
    });

    res.setHeader('Content-Type', 'audio/mpeg');

    return res.send(audioBuffer);
  } catch (err) {
    logger.error('Text-to-speech conversion failed', { error: err.message });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.speechToText = async (req, res) => {
  try {
    if (!req.file) {
      logger.warn('Audio file missing for STT request');
      return responseBuilder.badRequest(res, null, 'Audio file is required');
    }

    const audioBuffer = req.file.buffer;

    const text = await elevenlabsService.speechToText(audioBuffer);

    logger.info('Speech-to-text conversion successful');

    return responseBuilder.ok(res, { text }, 'Transcription successful');
  } catch (err) {
    console.error(err.response?.data || err.message);
    logger.error('Speech-to-text conversion failed', {
      error: err.response?.data || err.message,
    });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.getAllVoices = async (req, res) => {
  try {
    const voices = await elevenlabsService.getAllVoices();

    logger.info('Fetched all ElevenLabs voices', {
      count: voices?.length,
    });

    return responseBuilder.ok(res, voices, 'Voices fetched successfully');
  } catch (err) {
    logger.error('Failed to fetch ElevenLabs voices', {
      error: err.response?.data || err.message,
    });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.getVoiceById = async (req, res) => {
  try {
    const { voiceId } = req.params;

    if (!voiceId) {
      logger.warn('Voice ID missing');
      return responseBuilder.badRequest(res, null, 'Voice ID is required');
    }

    const voice = await elevenlabsService.getVoiceById(voiceId);

    logger.info('Fetched ElevenLabs voice', { voiceId });

    return responseBuilder.ok(res, voice, 'Voice fetched successfully');
  } catch (err) {
    logger.error('Failed to fetch ElevenLabs voice', {
      error: err.response?.data || err.message,
    });
    return responseBuilder.internalError(res, null, err.message);
  }
};

exports.cloneVoice = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      logger.warn('Voice clone failed: name missing');
      return responseBuilder.badRequest(res, null, 'Voice name is required');
    }

    if (!req.files || req.files.length === 0) {
      logger.warn('Voice clone failed: audio file missing');
      return responseBuilder.badRequest(
        res,
        null,
        'At least one audio file is required'
      );
    }

    const audioFiles = req.files.map((file) => file.buffer);

    const voice = await elevenlabsService.cloneVoice({
      name,
      description,
      audioFiles,
    });

    logger.info('Voice cloned successfully', {
      voiceId: voice.voice_id,
    });

    return responseBuilder.ok(
      res,
      voice,
      'Voice cloned successfully'
    );
  } catch (err) {
    logger.error('Voice cloning failed', {
      error: err.response?.data || err.message,
    });
    return responseBuilder.internalError(res, null, err.message);
  }
};
