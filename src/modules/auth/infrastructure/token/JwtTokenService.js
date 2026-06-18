'use strict';

const {
  buildAndStoreTokenPair,
  verifyAccessToken,
  hashRefreshToken,
  lookupRefreshToken,
  deleteRefreshToken,
  clearSession,
} = require('../../../../../utils/tokenUtils');
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
 * JWT-based token service backed by Redis for session tracking.
 *
 * Depends on IUserRepository (injected) rather than importing UserModel directly,
 * enforcing the infrastructure boundary and making this class testable in isolation.
 */
class JwtTokenService extends ITokenService {
  /**
   * @param {import('../../domain/repositories/IUserRepository')} userRepository
   */
  constructor(userRepository) {
    super();
    this.userRepository = userRepository;
  }

  /**
   * Issues a fresh access + refresh token pair and persists session metadata.
   * @param {import('../../domain/entities/User')} user
   * @param {string} method
   * @param {{ ip?: string, device?: string, deviceId?: string }} meta
   */
  async issue(user, method = 'email_password', meta = {}) {
    // buildAndStoreTokenPair needs an object with _id property
    const { accessToken, refreshTokenRaw, family } = await buildAndStoreTokenPair({ _id: user.id });

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
   * Verifies an access token signature and asserts it is of type 'access'.
   * @throws {AuthException} if invalid or wrong type
   */
  verifyAccessToken(token) {
    const decoded = verifyAccessToken(token);
    if (decoded.type !== 'access') {
      throw new AuthException('Invalid token type', 'INVALID_TOKEN');
    }
    return decoded;
  }

  /**
   * Rotates a refresh token: validates, deletes old, issues new pair.
   * Detecting reuse of a revoked token triggers an immediate session wipe (token-family rotation).
   *
   * @throws {AuthException} on missing, invalid, or reused refresh token
   */
  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new AuthException('Refresh token is required', 'INVALID_REFRESH_TOKEN');
    }

    const hashedToken = hashRefreshToken(rawRefreshToken);
    const userId = await lookupRefreshToken(hashedToken);

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

    // Rotate — delete old token before issuing new pair
    await deleteRefreshToken(hashedToken);

    const { accessToken, refreshTokenRaw, family } = await buildAndStoreTokenPair({ _id: userId });

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
   * Revokes all tokens for a user (logout or forced session termination).
   */
  async revoke(userId, rawRefreshToken) {
    const user = await this.userRepository.findById(userId);
    const hashedToken = rawRefreshToken ? hashRefreshToken(rawRefreshToken) : null;
    const family = user?.refreshTokenFamily || null;

    await clearSession(userId, hashedToken, family);

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
