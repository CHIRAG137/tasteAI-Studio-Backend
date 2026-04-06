const ChatBot = require('../models/ChatBot');
const FlowSession = require('../models/FlowSession');
const { verifyAuth0AccessToken } = require('./auth0Verify');

function getBearerToken(req) {
  const authHeader = req.header('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

/**
 * Enforce Auth0 visitor access token when the bot requires it.
 *
 * - If bot.require_visitor_auth0_identity is false: returns { ok: true, decoded: null }
 * - If required: verifies RS256 token and returns decoded { sub, email?, ... }
 */
exports.enforceVisitorAuth0ForBot = async ({ req, botId }) => {
  const bot = await ChatBot.findById(botId).lean();
  if (!bot) {
    return { ok: false, status: 404, message: 'Bot not found' };
  }

  // If request comes from authenticated dashboard user, allow access.
  if (req.user) {
    return { ok: true, decoded: null, bot };
  }

  if (!bot.require_visitor_auth0_identity) {
    return { ok: true, decoded: null, bot };
  }

  const token = getBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'auth0_access_token_required',
      message: 'Auth0 access token required',
      bot,
    };
  }

  try {
    const decoded = await verifyAuth0AccessToken(token);
    if (!decoded?.sub) {
      return {
        ok: false,
        status: 401,
        code: 'invalid_auth0_token',
        message: 'Invalid Auth0 token',
        bot,
      };
    }
    return { ok: true, decoded, bot };
  } catch (e) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_auth0_token',
      message: e.message || 'Invalid Auth0 token',
      bot,
    };
  }
};

exports.enforceVisitorAuth0ForFlowSession = async ({ req, flowSessionId }) => {
  const session = await FlowSession.findById(flowSessionId);
  if (!session) {
    return { ok: false, status: 404, message: 'Session not found' };
  }

  const check = await exports.enforceVisitorAuth0ForBot({
    req,
    botId: session.bot,
  });
  if (!check.ok) return check;

  if (check.bot.require_visitor_auth0_identity) {
    if (session.visitorAuth0Sub && session.visitorAuth0Sub !== check.decoded.sub) {
      return {
        ok: false,
        status: 403,
        code: 'visitor_identity_mismatch',
        message: 'Visitor identity does not match this session',
      };
    }
  }

  return { ok: true, decoded: check.decoded, session, bot: check.bot };
};

