const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
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
