'use strict';

const authService = require('../services/authService');
const qrService = require('../services/qrService');
const authUtils = require('../utils/authUtils');
const responseBuilder = require('../../utils/responseBuilder');
const logger = require('../../utils/logger');

/**
 * POST /auth/user/register
 * Success (new user):    201 - { userId, sessionId, qrDataUrl, expiresAt }
 * Success (link method): 200 - { linked: true, userId }
 */
exports.registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.registerUser(
      email,
      password,
      name,
      authUtils.getLoginMeta(req),
    );

    if (result.linked) {
      return responseBuilder.ok(res, result, 'Password linked to existing account');
    }

    return responseBuilder.created(
      res,
      result,
      'Registration successful. Please scan the QR code with your mobile device to activate your account.',
    );
  } catch (err) {
    logger.error('Registration failed', {
      error: err.message,
      email: req.body.email,
    });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

/**
 * POST /auth/user/login
 * Returns: { accessToken, refreshToken, user }
 */
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.loginUser(
      email,
      password,
      authUtils.getLoginMeta(req),
    );

    return responseBuilder.ok(
      res,
      { accessToken, refreshToken, user: authUtils.sanitiseUser(user) },
      'Login successful',
    );
  } catch (err) {
    logger.warn('Login failed', { error: err.message, email: req.body.email });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

/**
 * POST /auth/user/google-login
 * New user:  201 - { isNew, qrRequired, sessionId, qrDataUrl, expiresAt, user }
 * Existing:  200 - { accessToken, refreshToken, user }
 */
exports.googleLoginUser = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await authService.googleLoginUser(token, authUtils.getLoginMeta(req));

    if (result.qrRequired) {
      const { isNew, sessionId, qrDataUrl, expiresAt, user } = result;
      return responseBuilder.created(
        res,
        {
          isNew,
          qrRequired: true,
          sessionId,
          qrDataUrl,
          expiresAt,
          user: authUtils.sanitiseUser(user),
        },
        'Google account created. Please scan the QR code to activate your account.',
      );
    }

    const { accessToken, refreshToken, user } = result;
    return responseBuilder.ok(
      res,
      { accessToken, refreshToken, user: authUtils.sanitiseUser(user) },
      'Google login successful',
    );
  } catch (err) {
    logger.warn('Google login failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

/**
 * POST /auth/user/auth0-login
 */
exports.auth0LoginUser = async (req, res) => {
  try {
    const { accessToken } = req.body;
    const result = await authService.auth0LoginUser(accessToken, authUtils.getLoginMeta(req));

    if (result.qrRequired) {
      const { isNew, sessionId, qrDataUrl, expiresAt, user } = result;
      return responseBuilder.created(
        res,
        {
          isNew,
          qrRequired: true,
          sessionId,
          qrDataUrl,
          expiresAt,
          user: authUtils.sanitiseUser(user),
        },
        'Auth0 account created. Please scan the QR code to activate your account.',
      );
    }

    const { accessToken: at, refreshToken, user } = result;
    return responseBuilder.ok(
      res,
      { accessToken: at, refreshToken, user: authUtils.sanitiseUser(user) },
      'Auth0 login successful',
    );
  } catch (err) {
    logger.warn('Auth0 login failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

/**
 * POST /auth/user/refresh
 */
exports.refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    return responseBuilder.ok(res, tokens, 'Token refreshed');
  } catch (err) {
    logger.warn('Token refresh failed', { error: err.message });
    return responseBuilder.unauthorized(res, null, err.message);
  }
};

/**
 * POST /auth/user/logout
 * Requires: authMiddleware (req.user is set)
 */
exports.logoutUser = async (req, res) => {
  try {
    await authService.logoutUser(req.user._id);
    return responseBuilder.ok(res, null, 'Logged out successfully');
  } catch (err) {
    logger.error('Logout failed', {
      error: err.message,
      userId: req.user?._id,
    });
    return responseBuilder.internalError(res, null, 'Logout failed');
  }
};

/**
 * POST /auth/user/verify-qr
 * Called by the MOBILE APP after scanning the QR code. Activates the account and stores device info.
 * Body: { sessionId, phoneNumber?, countryCode? }
 * Device info is read from headers.
 */
exports.verifyQr = async (req, res) => {
  try {
    const { sessionId, phoneNumber, countryCode } = req.body;

    const deviceInfo = {
      userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
      platform: req.headers['x-device-platform'] || null,
      model: req.headers['x-device-model'] || null,
      os: req.headers['x-device-os'] || null,
      ip: req.clientIp,
    };

    await qrService.markQrScanned({ sessionId, deviceInfo, phoneNumber, countryCode });

    return responseBuilder.ok(res, null, 'Mobile verified. Your account is now active.');
  } catch (err) {
    logger.warn('QR verification failed', { error: err.message });
    return responseBuilder.badRequest(res, null, err.message);
  }
};

/**
 * GET /auth/user/qr-status/:sessionId
 * Called by the WEB CLIENT to poll for scan status.
 * Returns { status: 'pending' | 'scanned' | 'expired' }
 */
exports.pollQrStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await qrService.pollQrStatus(sessionId);
    return responseBuilder.ok(res, result, 'QR status fetched');
  } catch (err) {
    logger.error('QR status poll failed', { error: err.message });
    return responseBuilder.internalError(res, null, 'Failed to fetch QR status');
  }
};

/**
 * GET /auth/user/me
 * Returns the authenticated user's profile.
 */
exports.getMe = async (req, res) => {
  return responseBuilder.ok(res, authUtils.sanitiseUser(req.user), 'Profile fetched');
};
