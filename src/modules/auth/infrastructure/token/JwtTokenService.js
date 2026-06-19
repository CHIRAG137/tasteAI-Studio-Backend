'use strict';

const ITokenService = require('../../domain/services/ITokenService');
const AuthException = require('../../domain/exceptions/AuthException');
const UserNotFoundException = require('../../domain/exceptions/UserNotFoundException');
const UserInactiveException = require('../../domain/exceptions/UserInactiveException');
const UserBannedException = require('../../domain/exceptions/UserBannedException');
const logger = require('../../../shared/logging');

/**
 * Builds the lastLogin metadata object stored on user records.
 * @private
 */
function buildLastLoginMeta(method, meta = {}) {
  return {
    method,
    ip: meta.ip || 'Unknown',
    device: meta.device || 'Unknown',
    deviceId: meta.deviceId || null,
    at: new Date(),
  };
}

/**
 * JWT-based token service.
 *
 * Orchestrates token issuance, rotation, verification, and revocation.
 * Delegates cryptographic work to JwtSigner and session persistence to AuthTokenStore.
 *
 * Depends on abstractions (injected), not on concrete implementations:
 *   - IUserRepository   → findById, update
 *   - JwtSigner         → sign, verify, createRefreshToken, hashRefreshToken
 *   - AuthTokenStore    → storeTokenPair, lookupRefresh, deleteRefresh, clearSession
 */
class JwtTokenService extends ITokenService {
  /**
   * @param {import('../../domain/repositories/IUserRepository')} userRepository
   * @param {import('./JwtSigner')} jwtSigner
   * @param {import('./AuthTokenStore')} tokenStore
   */
  constructor(userRepository, jwtSigner, tokenStore) {
    super();
    this.userRepository = userRepository;
    this.jwtSigner = jwtSigner;
    this.tokenStore = tokenStore;
  }

  /**
   * Issues a fresh access + refresh token pair and persists session metadata.
   *
   * @param {import('../../domain/entities/User')} user
   * @param {string} method - Auth method for audit logging
   * @param {{ ip?: string, device?: string, deviceId?: string }} meta
   * @returns {Promise<{ accessToken: string, refreshToken: string }>}
   */
  async issue(user, method = 'email_password', meta = {}) {
    const accessToken = this.jwtSigner.signAccessToken(user.id, user.email);
    const {
      raw: refreshTokenRaw,
      hashed: refreshHashed,
      family,
    } = this.jwtSigner.createRefreshToken();

    await this.tokenStore.storeTokenPair({
      userId: user.id,
      accessToken,
      refreshHashed,
      family,
    });

    await this.userRepository.update(user.id, {
      $set: {
        refreshTokenFamily: family,
        lastLogin: buildLastLoginMeta(method, meta),
      },
    });

    logger.info('Token pair issued', { userId: user.id, method });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  /**
   * Verifies a JWT access token signature and type claim.
   *
   * @param {string} token
   * @returns {object} Decoded JWT payload
   * @throws {AuthException} if invalid or wrong type
   */
  verifyAccessToken(token) {
    let decoded;
    try {
      decoded = this.jwtSigner.verifyAccessToken(token);
    } catch {
      throw new AuthException('Invalid or expired access token', 'INVALID_TOKEN');
    }

    if (decoded.type !== 'access') {
      throw new AuthException('Invalid token type', 'INVALID_TOKEN');
    }

    return decoded;
  }

  /**
   * Rotates a refresh token (token-rotation security pattern).
   *
   * Validates the presented token, deletes it, and issues a fresh pair.
   * If the token is already gone (reuse detected), wipes the entire session.
   *
   * @param {string} rawRefreshToken
   * @returns {Promise<{ accessToken: string, refreshToken: string }>}
   * @throws {AuthException} on missing, invalid, or reused refresh token
   */
  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new AuthException('Refresh token is required', 'INVALID_REFRESH_TOKEN');
    }

    const hashedToken = this.jwtSigner.hashRefreshToken(rawRefreshToken);
    const userId = await this.tokenStore.lookupRefresh(hashedToken);

    if (!userId) {
      logger.warn('Refresh token not found — possible reuse or theft attempt');
      throw new AuthException(
        'Invalid or expired refresh token. Please log in again.',
        'INVALID_REFRESH_TOKEN',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UserNotFoundException();
    if (!user.isActive) throw new UserInactiveException();
    if (user.isBanned) throw new UserBannedException();

    // Rotate — invalidate old token before issuing new pair
    await this.tokenStore.deleteRefresh(hashedToken);

    const accessToken = this.jwtSigner.signAccessToken(userId, user.email);
    const {
      raw: refreshTokenRaw,
      hashed: newRefreshHashed,
      family,
    } = this.jwtSigner.createRefreshToken();

    await this.tokenStore.storeTokenPair({
      userId,
      accessToken,
      refreshHashed: newRefreshHashed,
      family,
    });

    await this.userRepository.update(userId, {
      $set: {
        refreshTokenFamily: family,
        lastLogin: buildLastLoginMeta(user.lastLogin?.method || 'email_password', {
          ip: user.lastLogin?.ip,
          device: user.lastLogin?.device,
          deviceId: user.lastLogin?.deviceId,
        }),
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  /**
   * Revokes all session tokens for a user (logout / forced termination).
   *
   * @param {string} userId
   * @param {string | null} rawRefreshToken
   */
  async revoke(userId, rawRefreshToken) {
    const user = await this.userRepository.findById(userId);
    const hashedToken = rawRefreshToken ? this.jwtSigner.hashRefreshToken(rawRefreshToken) : null;
    const family = user?.refreshTokenFamily || null;

    await this.tokenStore.clearSession(userId, hashedToken, family);

    await this.userRepository.update(userId, {
      $set: {
        refreshTokenFamily: null,
        lastLogoutAt: new Date(),
      },
    });

    logger.info('User session revoked', { userId });
  }
}

module.exports = JwtTokenService;
