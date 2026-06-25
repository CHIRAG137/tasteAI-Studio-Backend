'use strict';

/**
 * AuthFacade — unified, high-level interface over the entire auth subdomain.
 *
 * Implements the Facade pattern: controllers (and other consumers) interact
 * with a single object instead of wiring individual use cases.
 *
 * Each method delegates to the appropriate use case or query, translating
 * raw controller inputs into typed command objects. This keeps controllers
 * thin — they never import use cases or DTOs directly.
 */
class AuthFacade {
  constructor({
    registerUserUseCase,
    loginUserUseCase,
    oauthLoginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyQrUseCase,
    pollQrStatusUseCase,
    getCurrentUserUseCase,
  }) {
    this._registerUserUseCase = registerUserUseCase;
    this._loginUserUseCase = loginUserUseCase;
    this._oauthLoginUseCase = oauthLoginUseCase;
    this._refreshTokenUseCase = refreshTokenUseCase;
    this._logoutUserUseCase = logoutUserUseCase;
    this._verifyQrUseCase = verifyQrUseCase;
    this._pollQrStatusUseCase = pollQrStatusUseCase;
    this._getCurrentUserUseCase = getCurrentUserUseCase;
  }

  async register({ email, password, name, ip, userAgent }) {
    const { RegisterCommand } = require('../dto');
    const command = new RegisterCommand({ email, password, name, ip, userAgent });
    return this._registerUserUseCase.execute(command);
  }

  async login({ email, password, ip, userAgent, deviceId }) {
    const { LoginCommand } = require('../dto');
    const command = new LoginCommand({ email, password, ip, userAgent, deviceId });
    return this._loginUserUseCase.execute(command);
  }

  async oauthLogin({ token, accessToken, ip, userAgent, deviceId }, providerType) {
    const { LoginCommand } = require('../dto');
    const command = new LoginCommand({ token, accessToken, ip, userAgent, deviceId });
    return this._oauthLoginUseCase.execute(command, providerType);
  }

  async refresh(refreshToken) {
    const { RefreshTokenCommand } = require('../dto');
    const command = new RefreshTokenCommand({ refreshToken });
    return this._refreshTokenUseCase.execute(command);
  }

  async logout({ userId, refreshToken }) {
    const { LogoutCommand } = require('../dto');
    const command = new LogoutCommand({ userId, refreshToken });
    return this._logoutUserUseCase.execute(command);
  }

  async verifyQr({ sessionId, phoneNumber, countryCode, deviceInfo }) {
    const { VerifyQrCommand } = require('../dto');
    const command = new VerifyQrCommand({ sessionId, phoneNumber, countryCode, deviceInfo });
    return this._verifyQrUseCase.execute(command);
  }

  async pollQrStatus(sessionId) {
    return this._pollQrStatusUseCase.execute(sessionId);
  }

  async getProfile(userId) {
    return this._getCurrentUserUseCase.execute(userId);
  }
}

module.exports = AuthFacade;
