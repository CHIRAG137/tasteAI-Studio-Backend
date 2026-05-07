const crypto = require('crypto');
const ChatBot = require('../models/ChatBot');
const VisitorOtp = require('../models/VisitorOtp');
const VisitorVerification = require('../models/VisitorVerification');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmailUtil');
const { extractIpAddress } = require('../middlewares/ipExtractorMiddleware');
const { sha256 } = require('../utils/visitorEmailOtpEnforce');

const OTP_TTL_MINUTES = 10;
const VERIFICATION_TTL_DAYS = 30;
const MAX_OTP_ATTEMPTS = 8;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.requestOtp = async (req, res) => {
  try {
    const { botId, email, deviceId } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const ipAddress = req.clientIp || extractIpAddress(req);

    if (!botId) return responseBuilder.badRequest(res, null, 'botId is required');
    if (!deviceId) return responseBuilder.badRequest(res, null, 'deviceId is required');
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return responseBuilder.badRequest(res, null, 'A valid email is required');
    }

    const bot = await ChatBot.findById(botId).lean();
    if (!bot) return responseBuilder.notFound(res, null, 'Bot not found');
    if (!bot.require_visitor_email_verification) {
      return responseBuilder.badRequest(res, null, 'Visitor verification is not enabled for this bot');
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await VisitorOtp.findOneAndUpdate(
      { botId: bot._id, email: normalizedEmail, deviceId, ipAddress },
      { codeHash: sha256(otp), expiresAt, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const subject = `Your verification code for ${bot.name || 'TasteAI Studio'}`;
    const text = `Your one-time verification code is: ${otp}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes.\nIf you did not request this, you can ignore this email.`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height:1.5">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="margin:0 0 16px">Use this one-time code to continue chatting with <b>${bot.name || 'your bot'}</b>.</p>
        <div style="font-size:28px; letter-spacing:6px; font-weight:700; padding:14px 16px; border:1px solid #eee; border-radius:12px; display:inline-block; background:#fafafa">${otp}</div>
        <p style="margin:16px 0 0; color:#555">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
      </div>
    `;

    await sendEmail({ to: normalizedEmail, subject, text, html });
    logger.info('Visitor OTP sent', { botId: bot._id, email: normalizedEmail });

    return responseBuilder.ok(res, { sent: true, expiresInMinutes: OTP_TTL_MINUTES }, 'OTP sent');
  } catch (error) {
    logger.error('Failed to request visitor OTP', { error: error.message });
    return responseBuilder.internalError(res, null, 'Failed to send OTP');
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { botId, email, deviceId, otp } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const ipAddress = req.clientIp || extractIpAddress(req);

    if (!botId) return responseBuilder.badRequest(res, null, 'botId is required');
    if (!deviceId) return responseBuilder.badRequest(res, null, 'deviceId is required');
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return responseBuilder.badRequest(res, null, 'A valid email is required');
    }
    if (!otp || String(otp).trim().length < 4) {
      return responseBuilder.badRequest(res, null, 'OTP is required');
    }

    const bot = await ChatBot.findById(botId).lean();
    if (!bot) return responseBuilder.notFound(res, null, 'Bot not found');
    if (!bot.require_visitor_email_verification) {
      return responseBuilder.badRequest(res, null, 'Visitor verification is not enabled for this bot');
    }

    const record = await VisitorOtp.findOne({ botId: bot._id, email: normalizedEmail, deviceId, ipAddress });
    if (!record || record.expiresAt <= new Date()) {
      return responseBuilder.badRequest(res, null, 'OTP expired. Please request a new code.');
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      return responseBuilder.badRequest(res, null, 'Too many attempts. Please request a new code.');
    }

    record.attempts += 1;
    await record.save();

    if (record.codeHash !== sha256(String(otp).trim())) {
      return responseBuilder.badRequest(res, null, 'Invalid code. Please try again.');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    await VisitorVerification.findOneAndUpdate(
      { botId: bot._id, deviceId, ipAddress },
      {
        botId: bot._id,
        deviceId,
        ipAddress,
        email: normalizedEmail,
        tokenHash: sha256(token),
        verifiedAt: new Date(),
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await VisitorOtp.deleteOne({ _id: record._id });

    logger.info('Visitor verified', { botId: bot._id, email: normalizedEmail });
    return responseBuilder.ok(
      res,
      { verified: true, token, email: normalizedEmail, expiresAt },
      'Verified'
    );
  } catch (error) {
    logger.error('Failed to verify visitor OTP', { error: error.message });
    return responseBuilder.internalError(res, null, 'Failed to verify code');
  }
};

