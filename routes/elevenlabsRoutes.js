const express = require("express");
const elevenlabsController = require("../controllers/elevenlabsController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/text-to-speech", elevenlabsController.textToSpeech);
router.post("/speech-to-text", upload.single("audio"), elevenlabsController.speechToText);

module.exports = router;