const express = require('express');
const router = express.Router();
const handoffController = require('../controllers/handoffController');
const { authenticateHumanAgent } = require('../middlewares/humanAgentAuthMiddleware');

/**
 * @route   POST /api/handoff/request
 * @desc    User requests human handoff (public - called from chat bot)
 * @access  Public
 */
router.post('/request', handoffController.requestHandoff);

/**
 * @route   GET /api/handoff/sessions
 * @desc    Get all handoff sessions for the authenticated agent
 * @query   status - Filter by status ('all', 'active', 'pending', 'resolved')
 * @query   includeEscalated - Include escalated sessions (default: true)
 * @query   page - Page number for pagination
 * @query   limit - Items per page
 * @access  Private (Agent must be authenticated)
 */
router.get('/sessions', authenticateHumanAgent, handoffController.getHumanAgentHandoffs);

/**
 * @route   POST /api/handoff/:id/accept
 * @desc    Agent accepts a handoff session
 * @access  Private (Agent only)
 */
router.post('/:id/accept', authenticateHumanAgent, handoffController.acceptHandoff);

/**
 * @route   POST /api/handoff/:id/resolve
 * @desc    Agent resolves a handoff session
 * @access  Private (Agent only)
 */
router.post('/:id/resolve', authenticateHumanAgent, handoffController.resolveHandoff);

/**
 * Agent reopens a resolved session
 */
router.post('/:id/reopen', authenticateHumanAgent, handoffController.reopenByAgent);

/**
 * @route   POST /api/handoff/:id/message
 * @desc    Add a message to handoff session
 * @access  Private (Agent only)
 */
router.post('/:id/message', authenticateHumanAgent, handoffController.addMessage);

/**
 * @route   GET /api/handoff/:id/messages
 * @desc    Get messages for a handoff session
 * @access  Private (Agent only)
 */
router.get('/:id/messages', authenticateHumanAgent, handoffController.getMessages);

/**
 * @route   POST /api/handoff/:id/client-message
 * @desc    Client adds a message to handoff session
 * @access  Public (called from chat bot)
 */
router.post('/:id/client-message', handoffController.addClientMessage);

// Client resolve / reopen endpoints (public)
router.post('/:id/client-resolve', handoffController.resolveByClient);
router.post('/:id/client-reopen', handoffController.reopenByClient);

/**
 * @route   GET /api/handoff/:id/client-messages
 * @desc    Client gets messages for a handoff session
 * @access  Public (called from chat bot)
 * @query   flowSessionId=xxx (required)
 */
router.get('/:id/client-messages', handoffController.getClientMessages);

/**
 * @route   POST /api/handoff/:id/rate
 * @desc    Client submits rating and optional feedback for a handoff session
 * @access  Public (called from chat bot)
 */
router.post('/:id/rate', handoffController.rateByClient);

/**
 * @route   GET /api/handoff/:id/rating
 * @desc    Get existing rating for a handoff session
 * @access  Public (called from chat bot)
 * @query   flowSessionId=xxx (required)
 */
router.get('/:id/rating', handoffController.getSessionRating);

module.exports = router;