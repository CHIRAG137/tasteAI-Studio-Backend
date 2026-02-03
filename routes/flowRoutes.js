const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flowController');
const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');
router.use(attachIpAddress);

// start a new session for a bot
router.post('/start/:botId', flowController.startFlow);

// respond to a session waiting for input
// body: { input: "Chirag", optionIndexOrLabel: 0 }
router.post('/session/:sessionId/respond', flowController.respondToFlow);

// add a system message to flow session (for handoff messages, etc)
// body: { message: "message text", messageType: "handoff_*", handoffSessionId?: "id" }
router.post('/session/:sessionId/system-message', flowController.addSystemMessage);

module.exports = router;
