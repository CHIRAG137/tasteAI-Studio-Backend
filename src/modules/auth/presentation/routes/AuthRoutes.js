'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { env } = require('../../../../config/env');
const authValidator = require('../validators/AuthValidator');
const { attachIpAddress } = require('../middleware/IpMiddleware');
const asyncHandler = require('../../../shared/middleware/asyncHandler');
const AuthProviderType = require('../../infrastructure/strategies/auth/AuthProviderType');

function setAuthProvider(providerType) {
  return (req, res, next) => {
    req.authProvider = providerType;
    next();
  };
}

function setVerificationType(verificationType) {
  return (req, res, next) => {
    req.verificationType = verificationType;
    next();
  };
}

module.exports = function createAuthRoutes({ authController, authMiddleware }) {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  });

  const qrLimiter = rateLimit({
    windowMs: env.QR_RATE_LIMIT_WINDOW_MS,
    max: env.QR_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post(
    '/register',
    setAuthProvider(AuthProviderType.EMAIL_PASSWORD),
    attachIpAddress,
    authLimiter,
    authValidator.registerRules,
    asyncHandler(authController.register),
  );

  router.post(
    '/login',
    attachIpAddress,
    authLimiter,
    authValidator.loginRules,
    asyncHandler(authController.login),
  );

  router.post(
    '/google-login',
    attachIpAddress,
    authLimiter,
    setAuthProvider(AuthProviderType.GOOGLE),
    authValidator.googleLoginRules,
    asyncHandler(authController.oauthLogin),
  );

  router.post(
    '/auth0-login',
    attachIpAddress,
    authLimiter,
    setAuthProvider(AuthProviderType.AUTH0),
    authValidator.auth0LoginRules,
    asyncHandler(authController.oauthLogin),
  );

  router.post(
    '/refresh',
    attachIpAddress,
    authLimiter,
    authValidator.refreshRules,
    asyncHandler(authController.refresh),
  );

  router.post(
    '/verify-qr',
    setVerificationType('qr'),
    attachIpAddress,
    qrLimiter,
    authValidator.qrVerifyRules,
    asyncHandler(authController.verify),
  );

  router.get(
    '/verify-qr',
    setVerificationType('qr'),
    attachIpAddress,
    qrLimiter,
    authValidator.qrVerifyRules,
    asyncHandler(authController.verify),
  );

  router.get(
    '/qr-status/:sessionId',
    setVerificationType('qr'),
    qrLimiter,
    authValidator.qrPollRules,
    asyncHandler(authController.pollVerificationStatus),
  );

  router.post('/logout', authMiddleware.requireAuth, asyncHandler(authController.logout));

  router.get('/me', authMiddleware.requireAuth, asyncHandler(authController.me));

  return router;
};
