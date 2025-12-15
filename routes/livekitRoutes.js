const express = require('express');
const router = express.Router();

const tavusController = require('../controllers/livekitController');

router.post('/create-conversation', tavusController.createConversation);
router.post('/send-message', tavusController.sendMessage);
router.post('/end-conversation', tavusController.endConversation);

router.post('/flashcard/flip', tavusController.flipFlashCard);
router.post('/quiz/submit', tavusController.submitQuiz);

module.exports = router;
