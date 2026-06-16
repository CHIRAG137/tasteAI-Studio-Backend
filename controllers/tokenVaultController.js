const { verifyAuth0AccessToken } = require('../utils/auth0Verify');
const { exchangeThirdPartyToken } = require('../services/tokenVaultService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

/**
 * POST /api/auth/token-vault/exchange
 * Body: { accessToken: string (Auth0 user access token), connection: string (e.g. google-oauth2) }
 * Requires: Bearer app JWT + user must have signed in with Auth0 at least once (auth0Id on profile).
 */
exports.exchangeConnectionToken = async (req, res) => {
  try {
    const { accessToken: auth0AccessToken, connection } = req.body;

    if (!auth0AccessToken || !connection) {
      return responseBuilder.badRequest(
        res,
        null,
        'accessToken (Auth0) and connection (e.g. google-oauth2) are required',
      );
    }

    if (!req.user.auth0Id) {
      return responseBuilder.badRequest(
        res,
        null,
        'Token Vault requires an Auth0-linked account. Sign in with Auth0 once, then try again.',
      );
    }

    const decoded = await verifyAuth0AccessToken(auth0AccessToken);
    if (decoded.sub !== req.user.auth0Id) {
      logger.warn('Auth0 token sub mismatch for Token Vault', {
        userId: req.user._id,
      });
      return responseBuilder.forbidden(res, null, 'Auth0 access token does not match this user');
    }

    const result = await exchangeThirdPartyToken({
      auth0AccessToken,
      connection,
    });

    return responseBuilder.ok(res, result, 'Third-party token retrieved');
  } catch (err) {
    logger.error('Token Vault exchange failed', { error: err.message });
    const msg = err.response?.data?.error_description || err.response?.data?.error || err.message;
    return responseBuilder.badRequest(res, null, msg || 'Token exchange failed');
  }
};
