'use strict';

const {
  AppException,
  UnauthorizedException,
  ForbiddenException,
} = require('../../../shared/exceptions');
const logger = require('../../../shared/logging');

function buildLastLoginMeta(method, meta = {}) {
  return {
    method,
    ip: meta.ip || 'Unknown',
    device: meta.device || 'Unknown',
    deviceId: meta.deviceId || null,
    at: new Date(),
  };
}

class JwtTokenService {
  constructor(userRepository, jwtSigner, tokenStore) {
    this.userRepository = userRepository;
    this.jwtSigner = jwtSigner;
    this.tokenStore = tokenStore;
  }

  async issue(user, method = 'email_password', meta = {}) {
    const accessToken = this.jwtSigner.signAccessToken(user.id, user.email);
    const {
      raw: refreshTokenRaw,
      hashed: refreshHashed,
      family,
    } = this.jwtSigner.createRefreshToken();

    await this.tokenStore.storeTokenPair({ userId: user.id, accessToken, refreshHashed, family });

    await this.userRepository.update(user.id, {
      refreshTokenFamily: family,
      lastLogin: buildLastLoginMeta(method, meta),
    });

    logger.info('Token pair issued', { userId: user.id, method });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  verifyAccessToken(token) {
    let decoded;
    try {
      decoded = this.jwtSigner.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token', 'INVALID_TOKEN');
    }

    if (decoded.type !== 'access') {
      throw new UnauthorizedException('Invalid token type', 'INVALID_TOKEN');
    }

    return decoded;
  }

  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required', 'INVALID_REFRESH_TOKEN');
    }

    const hashedToken = this.jwtSigner.hashRefreshToken(rawRefreshToken);
    const userId = await this.tokenStore.lookupRefresh(hashedToken);

    if (!userId) {
      logger.warn('Refresh token not found — possible reuse or theft attempt');
      throw new UnauthorizedException(
        'Invalid or expired refresh token. Please log in again.',
        'INVALID_REFRESH_TOKEN',
      );
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found', 'USER_NOT_FOUND');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account not yet activated');
    }
    if (user.isBanned) {
      throw new ForbiddenException('Account suspended');
    }

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
      refreshTokenFamily: family,
      lastLogin: buildLastLoginMeta(user.lastLogin?.method || 'email_password', {
        ip: user.lastLogin?.ip,
        device: user.lastLogin?.device,
        deviceId: user.lastLogin?.deviceId,
      }),
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async revoke(userId, rawRefreshToken) {
    const user = await this.userRepository.findById(userId);
    const hashedToken = rawRefreshToken ? this.jwtSigner.hashRefreshToken(rawRefreshToken) : null;
    const family = user?.refreshTokenFamily || null;

    await this.tokenStore.clearSession(userId, hashedToken, family);

    await this.userRepository.update(userId, {
      refreshTokenFamily: null,
      lastLogoutAt: new Date(),
    });

    logger.info('User session revoked', { userId });
  }
}

module.exports = JwtTokenService;
