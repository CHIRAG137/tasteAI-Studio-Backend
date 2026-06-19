const express = require('express');

const router = express.Router();
const authController = require('../controllers/authController');
const tokenVaultController = require('../controllers/tokenVaultController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @route   GET /api/auth/last-login
 * @desc    Get last login info for a user by email
 * @access  Public
 */
router.get('/last-login', authController.getLastLoginInfo);

/**
 * @route   POST /api/auth/token-vault/exchange
 * @desc    Token Vault: exchange Auth0 user token for third-party API access token
 * @access  Private (Bearer app JWT + matching Auth0 access token in body)
 */
router.post('/token-vault/exchange', authMiddleware, tokenVaultController.exchangeConnectionToken);

/**
 * @route   PATCH /api/auth/me
 * @desc    Update currently authenticated user's profile (name)
 * @access  Private
 * @headers Authorization: Bearer <JWT>
 * @body    { name: string }
 */
router.patch('/me', authMiddleware, authController.updateMyProfile);

// logout routes
router.post('/logout/agent', authMiddleware, authController.logoutAgent);
router.post('/logout/bot', authMiddleware, authController.logoutBot);

module.exports = router;
