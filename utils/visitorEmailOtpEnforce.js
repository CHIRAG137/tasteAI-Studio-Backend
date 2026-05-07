const crypto = require('crypto');
const VisitorVerification = require('../models/VisitorVerification');
const responseBuilder = require('./responseBuilder');
const { extractIpAddress } = require('../middlewares/ipExtractorMiddleware');

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function getDeviceId(req) {
  return req.headers['x-visitor-device-id'] || req.headers['x-device-id'] || null;
}

function getVisitorToken(req) {
  return req.headers['x-visitor-verification-token'] || null;
}

/**
 * Enforce visitor email verification for a bot.
 * - Only applies to unauthenticated requests (req.user absent)
 * - Validates token for (botId + deviceId + ipAddress)
 */
exports.enforceVisitorEmailVerificationForBot = async (req, res, bot) => {
  try {
    if (!bot?.require_visitor_email_verification) return true;
    if (req.user) return true;

    const deviceId = getDeviceId(req);
    const token = getVisitorToken(req);
    const ipAddress = req.clientIp || extractIpAddress(req);

    if (!deviceId || !token) {
      responseBuilder.unauthorized(res, { code: 'visitor_email_verification_required' }, 'Visitor verification required');
      return false;
    }

    const record = await VisitorVerification.findOne({
      botId: bot._id,
      deviceId,
      ipAddress,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!record) {
      responseBuilder.unauthorized(res, { code: 'visitor_email_verification_required' }, 'Visitor verification required');
      return false;
    }

    if (record.tokenHash !== sha256(token)) {
      responseBuilder.unauthorized(res, { code: 'visitor_email_verification_required' }, 'Visitor verification required');
      return false;
    }

    return true;
  } catch (error) {
    responseBuilder.unauthorized(res, { code: 'visitor_email_verification_required' }, 'Visitor verification required');
    return false;
  }
};

exports.sha256 = sha256;
