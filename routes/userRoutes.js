const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// All routes below require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/user/api-keys
 * @desc    List saved API keys (masked)
 * @access  Private
 */
router.get('/api-keys', userController.listMyApiKeys);

/**
 * @route   PUT /api/user/api-keys/:provider
 * @desc    Save/update API key for provider (encrypted at rest)
 * @access  Private
 * @body    { apiKey: string }
 */
router.put('/api-keys/:provider', userController.upsertMyApiKey);

/**
 * @route   DELETE /api/user/api-keys/:provider
 * @desc    Delete API key for provider
 * @access  Private
 */
router.delete('/api-keys/:provider', userController.deleteMyApiKey);

/**
 * @route   POST /api/user/api-keys/:provider/test
 * @desc    Validate saved API key for provider
 * @access  Private
 * @body    { model?: string }
 */
router.post('/api-keys/:provider/test', userController.testMyApiKey);

module.exports = router;
