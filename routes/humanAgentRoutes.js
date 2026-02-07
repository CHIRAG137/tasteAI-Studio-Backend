const express = require('express');
const router = express.Router();
const humanAgentController = require('../controllers/humanAgentController');
const { authenticateHumanAgent } = require('../middlewares/humanAgentAuthMiddleware');

/**
 * @route   POST /api/human-agent/verify-token
 * @desc    Verify the token sent on email
 * @access  Public
 */
router.post('/verify-token', humanAgentController.humanAgentVerifyToken);

/**
 * @route   POST /api/human-agent/set-password
 * @desc    Set human agent account password
 * @access  Public
 */
router.post('/set-password', humanAgentController.humanAgentSetPassword);

/**
 * @route   POST /api/human-agent/login
 * @desc    Human Agent login
 * @access  Public
 */
router.post('/login', humanAgentController.humanAgentLogin);

/**
 * @route   GET /api/human-agent/bots
 * @desc    Get chatbots by human agent id
 * @access  Private (Human Agent)
 */
router.get('/bots', authenticateHumanAgent, humanAgentController.getBotsByHumanAgentId);

/**
 * @route   PUT /api/human-agent/status
 * @desc    Update human agent status
 * @access  Private (Human Agent)
 */
router.put('/status', authenticateHumanAgent, humanAgentController.updateHumanAgentStatus);

/**
 * @route   GET /api/human-agent/stats
 * @desc    Update human agent stats
 * @access  Private (Human Agent)
 */
router.get('/stats', authenticateHumanAgent, humanAgentController.getHumanAgentStatsById);

/**
 * @route   GET /api/human-agent/profile
 * @desc    Get logged-in human agent profile
 * @access  Private (Human Agent)
 */
router.get(
  '/profile',
  authenticateHumanAgent,
  humanAgentController.getHumanAgentProfileByAgentId
);

/**
 * @route   PUT /api/human-agent/profile
 * @desc    Update logged-in human agent profile
 * @access  Private (Human Agent)
 */
router.put(
  '/profile',
  authenticateHumanAgent,
  humanAgentController.updateHumanAgentProfileByAgentId
);

/**
 * @route   GET /api/bots/:botId/agents
 * @desc    Get all agents for a bot with comprehensive stats
 * @access  Private (requires bot admin or owner)
 */
router.get('/bot/:botId/agents', humanAgentController.getAgentsByBotId);

module.exports = router;