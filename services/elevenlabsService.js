const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

exports.textToSpeech = async (text) => {
  if (!text) {
    logger.error('TextToSpeech failed: text missing');
    throw new Error('Text is required for text-to-speech');
  }

  logger.info('Starting textToSpeech request', {
    voiceId: ELEVENLABS_VOICE_ID,
    textLength: text.length,
  });

  try {
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.info('TextToSpeech completed successfully', {
      voiceId: ELEVENLABS_VOICE_ID,
      audioBytes: resp.data?.byteLength,
    });

    return resp.data;
  } catch (error) {
    logger.error('Error in textToSpeech', {
      voiceId: ELEVENLABS_VOICE_ID,
      error: error.response?.data || error.message,
    });
    throw error;
  }
};

exports.speechToText = async (audioBuffer) => {
  if (!audioBuffer) {
    logger.error('SpeechToText failed: audio buffer missing');
    throw new Error('Audio buffer is required for speech-to-text');
  }

  logger.info('Starting speechToText request', {
    audioSize: audioBuffer.length,
    model: 'scribe_v2',
  });

  const formData = new FormData();
  formData.append('model_id', 'scribe_v2');
  formData.append('file', audioBuffer, {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg',
  });

  try {
    const resp = await axios.post(
      'https://api.elevenlabs.io/v1/speech-to-text',
      formData,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          ...formData.getHeaders(),
        },
      }
    );

    logger.info('SpeechToText completed successfully', {
      textLength: resp.data?.text?.length,
    });

    return resp.data.text;
  } catch (error) {
    logger.error('Error in speechToText', {
      error: error.response?.data || error.message,
    });
    throw error;
  }
};
