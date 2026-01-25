const express = require('express');
const router = express.Router();
const humanAgentController = require('../controllers/humanAgentController');
const { authenticateHumanAgent } = require('../middlewares/humanAgentAuthMiddleware');

router.post('/verify-token', humanAgentController.verifyToken);
router.post('/set-password', humanAgentController.setPassword);
router.post('/login', humanAgentController.login);
router.get('/bots', authenticateHumanAgent, humanAgentController.getBotsByAgent);
router.put('/status', authenticateHumanAgent, humanAgentController.updateAgentStatus);
router.get('/stats', authenticateHumanAgent, humanAgentController.getAgentStats);
router.post('/heartbeat', authenticateHumanAgent, humanAgentController.heartbeat);

module.exports = router;