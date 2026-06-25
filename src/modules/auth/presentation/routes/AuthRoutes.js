'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { env } = require('../../../../config/env');
const authValidator = require('../validators/AuthValidator');
const { attachIpAddress } = require('../middleware/IpMiddleware');
const asyncHandler = require('../../../shared/middleware/asyncHandler');

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
    authValidator.googleLoginRules,
    asyncHandler(authController.googleLogin),
  );

  router.post(
    '/auth0-login',
    attachIpAddress,
    authLimiter,
    authValidator.auth0LoginRules,
    asyncHandler(authController.auth0Login),
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
    attachIpAddress,
    qrLimiter,
    authValidator.qrVerifyRules,
    asyncHandler(authController.verifyQr),
  );

  router.get(
    '/verify-qr',
    attachIpAddress,
    qrLimiter,
    authValidator.qrVerifyRules,
    asyncHandler(authController.verifyQr),
  );

  router.get(
    '/qr-status/:sessionId',
    qrLimiter,
    authValidator.qrPollRules,
    asyncHandler(authController.pollQrStatus),
  );

  router.post('/logout', authMiddleware.requireAuth, asyncHandler(authController.logout));

  router.get('/me', authMiddleware.requireAuth, asyncHandler(authController.me));

  return router;
};
