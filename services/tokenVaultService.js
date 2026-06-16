const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Exchanges an Auth0 user access token for a third-party provider access token (Token Vault).
 * Requires a Machine-to-Machine application or app credentials with token-exchange grant enabled.
 *
 * @see https://auth0.com/docs/secure/tokens/token-vault/refresh-token-exchange-with-token-vault
 */
exports.exchangeThirdPartyToken = async ({ auth0AccessToken, connection }) => {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error(
      'Token Vault is not configured. Set AUTH0_DOMAIN, AUTH0_AUDIENCE, and AUTH0_M2M_CLIENT_ID / AUTH0_M2M_CLIENT_SECRET (or AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET for confidential app).',
    );
  }

  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    client_id: clientId,
    client_secret: clientSecret,
    subject_token: auth0AccessToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
    requested_token_type: 'urn:auth0:params:oauth:token-type:third-party-access-token',
    connection,
  });

  if (process.env.AUTH0_AUDIENCE) {
    params.append('audience', process.env.AUTH0_AUDIENCE);
  }

  const { data } = await axios.post(`https://${domain}/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });

  logger.info('Token Vault exchange completed', { connection });
  return data;
};
