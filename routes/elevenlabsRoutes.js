const express = require('express');
const elevenlabsController = require('../controllers/elevenlabsController');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/text-to-speech', elevenlabsController.textToSpeech);
router.post('/speech-to-text', upload.single('audio'), elevenlabsController.speechToText);
router.get('/voices', elevenlabsController.getAllVoices);
router.get('/voices/:voiceId', elevenlabsController.getVoiceById);
router.post('/voices/clone', upload.array('audio', 5), elevenlabsController.cloneVoice);

module.exports = router;
