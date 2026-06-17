'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { attachIpAddress } = require('../middlewares/ipMiddleware');
const authValidator = require('../validators/authValidator');

const router = express.Router();

// TODO: In production, consider more sophisticated rate limiting (e.g. by IP + user account) and distributed store (Redis) to prevent abuse while minimizing impact on legitimate users.
// For auth endpoints, we want to be more aggressive to protect against brute-force attacks, but for QR code polling we can be more lenient since it's expected to be called frequently by the web client.
// Create a common rate limiter for auth endpoints (except QR polling) and a separate one for QR polling. Both return a consistent error response when the limit is exceeded.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },
});

const qrLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60, // generous — web client polls every second
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/user/register
 * @desc    Register new user with email & password.
 *          Returns QR code for mobile verification.
 * @access  Public
 */
router.post(
  '/register',
  attachIpAddress,
  authLimiter,
  authValidator.registerRules,
  authController.registerUser,
);

/**
 * @route   POST /api/auth/user/login
 * @desc    Login with email & password.
 *          Returns access + refresh tokens.
 * @access  Public
 */
router.post(
  '/login',
  attachIpAddress,
  authLimiter,
  authValidator.loginRules,
  authController.loginUser,
);

/**
 * @route   POST /api/auth/user/google-login
 * @desc    Login or register via Google.
 *          New users receive a QR code. Existing users get tokens directly.
 * @access  Public
 */
router.post(
  '/google-login',
  attachIpAddress,
  authLimiter,
  authValidator.googleLoginRules,
  authController.googleLoginUser,
);

/**
 * @route   POST /api/auth/user/auth0-login
 * @desc    Login or register via Auth0 Universal Login.
 *          New users receive a QR code. Existing users get tokens directly.
 * @access  Public
 */
router.post(
  '/auth0-login',
  attachIpAddress,
  authLimiter,
  authValidator.auth0LoginRules,
  authController.auth0LoginUser,
);

/**
 * @route   POST /api/auth/user/refresh
 * @desc    Exchange a refresh token for a new access + refresh token pair.
 * @access  Public (token in body)
 */
router.post(
  '/refresh',
  attachIpAddress,
  authLimiter,
  authValidator.refreshRules,
  authController.refreshTokens,
);

/**
 * @route   POST /api/auth/user/verify-qr
 * @desc    Called by the mobile app after scanning the QR code.
 *          Activates the account and records device info.
 * @access  Public (mobile app)
 */
router.post(
  '/verify-qr',
  attachIpAddress,
  qrLimiter,
  authValidator.qrVerifyRules,
  authController.verifyQr,
);

/**
 * @route   GET /api/auth/user/qr-status/:sessionId
 * @desc    Web client polls this until status is 'scanned' or 'expired'.
 * @access  Public
 */
router.get(
  '/qr-status/:sessionId',
  qrLimiter,
  authValidator.qrPollRules,
  authController.pollQrStatus,
);

/**
 * @route   POST /api/auth/user/logout
 * @desc    Invalidate current session tokens.
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logoutUser);

/**
 * @route   GET /api/auth/user/me
 * @desc    Return the authenticated user's profile.
 * @access  Private
 */
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
