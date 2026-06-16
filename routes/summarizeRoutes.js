const express = require('express');

const router = express.Router();
const summarizerController = require('../controllers/summarizeController');

/**
 * @route   POST /api/summarize
 * @desc    Summarize a chatbot conversation using Gemini
 */
router.post('/', summarizerController.summarizeSessionConversation);

module.exports = router;
