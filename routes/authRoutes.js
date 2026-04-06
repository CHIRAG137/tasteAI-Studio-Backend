const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const tokenVaultController = require('../controllers/tokenVaultController');
const { authMiddleware } = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user using email and password
 * @access  Public
 */
router.post('/register', authController.registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user using email and password and return JWT
 * @access  Public
 */
router.post('/login', authController.loginUser);

/**
 * @route   POST /api/auth/google-login
 * @desc    Authenticate or register a user using Google OAuth
 * @access  Public
 */
router.post('/google-login', authController.googleLoginUser);

/**
 * @route   POST /api/auth/auth0-login
 * @desc    Exchange Auth0 access token for app session (JWT)
 * @access  Public
 */
router.post('/auth0-login', authController.auth0LoginUser);

/**
 * @route   POST /api/auth/token-vault/exchange
 * @desc    Token Vault: exchange Auth0 user token for third-party API access token
 * @access  Private (Bearer app JWT + matching Auth0 access token in body)
 */
router.post(
  '/token-vault/exchange',
  authMiddleware,
  tokenVaultController.exchangeConnectionToken,
);

/**
 * @route   GET /api/auth/me
 * @desc    Get details of the currently authenticated user
 * @access  Private
 * @headers Authorization: Bearer <JWT>
 */
router.get('/me', authMiddleware, authController.getUserDetailsByUserId);

// logout routes
router.post('/logout/agent', authMiddleware, authController.logoutAgent);
router.post('/logout/bot', authMiddleware, authController.logoutBot);

module.exports = router;
