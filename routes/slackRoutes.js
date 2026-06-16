const express = require('express');

const router = express.Router();
const slackController = require('../controllers/slackController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/slack/install
 * @desc    Initiate Slack OAuth flow and generate authorization URL
 * @access  Private (Authenticated user)
 */
router.get('/install', authMiddleware, slackController.initiateSlackOAuth);

/**
 * @route   GET /api/slack/oauth/callback
 * @desc    Handle Slack OAuth callback and store access tokens
 * @access  Public (Called by Slack)
 */
router.get('/oauth/callback', slackController.handleSlackOAuthCallback);

/**
 * @route   POST /api/slack/events
 * @desc    Handle incoming Slack events and commands
 * @access  Public (Called by Slack)
 */
router.post('/events', slackController.handleCommand);

module.exports = router;
