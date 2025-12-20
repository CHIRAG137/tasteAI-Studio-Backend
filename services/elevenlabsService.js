const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

exports.textToSpeech = async (text, voiceId) => {
  if (!text) {
    logger.error('TextToSpeech failed: text missing');
    throw new Error('Text is required for text-to-speech');
  }

  logger.info('Starting textToSpeech request', {
    voiceId: voiceId,
    textLength: text.length,
  });

  try {
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
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
      voiceId: voiceId,
      audioBytes: resp.data?.byteLength,
    });

    return resp.data;
  } catch (error) {
    logger.error('Error in textToSpeech', {
      voiceId: voiceId,
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

exports.getAllVoices = async () => {
  logger.info('Fetching all ElevenLabs voices');

  try {
    const resp = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    logger.info('Fetched voices successfully', {
      count: resp.data?.voices?.length,
    });

    return resp.data.voices;
  } catch (error) {
    logger.error('Error fetching voices', {
      error: error.response?.data || error.message,
    });
    throw error;
  }
};

exports.getVoiceById = async (voiceId) => {
  if (!voiceId) {
    throw new Error('Voice ID is required');
  }

  logger.info('Fetching ElevenLabs voice', { voiceId });

  try {
    const resp = await axios.get(
      `https://api.elevenlabs.io/v1/voices/${voiceId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    return resp.data;
  } catch (error) {
    logger.error('Error fetching voice by ID', {
      voiceId,
      error: error.response?.data || error.message,
    });
    throw error;
  }
};

exports.cloneVoice = async ({ name, description, audioFiles }) => {
  if (!audioFiles || audioFiles.length === 0) {
    throw new Error('Audio files are required for voice cloning');
  }

  logger.info('Starting voice cloning', {
    name,
    filesCount: audioFiles.length,
  });

  const formData = new FormData();
  formData.append('name', name);

  if (description) {
    formData.append('description', description);
  }

  audioFiles.forEach((buffer, index) => {
    formData.append('files', buffer, {
      filename: `sample-${index + 1}.mp3`,
      contentType: 'audio/mpeg',
    });
  });

  try {
    const resp = await axios.post(
      'https://api.elevenlabs.io/v1/voices/add',
      formData,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          ...formData.getHeaders(),
        },
      }
    );

    logger.info('Voice cloning completed', {
      voiceId: resp.data?.voice_id,
    });

    return resp.data;
  } catch (error) {
    logger.error('Error cloning voice', {
      error: error.response?.data || error.message,
    });
    throw error;
  }
};
