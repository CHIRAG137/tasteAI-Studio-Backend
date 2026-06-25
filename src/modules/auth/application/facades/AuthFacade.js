'use strict';

class AuthFacade {
  constructor({
    registerUseCase,
    loginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyUseCase,
    pollVerificationUseCase,
    getCurrentUserUseCase,
  }) {
    this._registerUseCase = registerUseCase;
    this._loginUseCase = loginUseCase;
    this._refreshTokenUseCase = refreshTokenUseCase;
    this._logoutUserUseCase = logoutUserUseCase;
    this._verifyUseCase = verifyUseCase;
    this._pollVerificationUseCase = pollVerificationUseCase;
    this._getCurrentUserUseCase = getCurrentUserUseCase;
  }

  async register({ email, password, name, ip, userAgent }, providerType) {
    const { RegisterCommand } = require('../dto');
    const command = new RegisterCommand({ email, password, name, ip, userAgent });
    return this._registerUseCase.execute(command, providerType);
  }

  async login({ email, password, token, accessToken, ip, userAgent, deviceId }, providerType) {
    const { LoginCommand } = require('../dto');
    const command = new LoginCommand({
      provider: providerType,
      email,
      password,
      token,
      accessToken,
      ip,
      userAgent,
      deviceId,
    });
    return this._loginUseCase.execute(command, providerType);
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

  async verify(verificationType, { sessionId, phoneNumber, countryCode, deviceInfo }) {
    const { VerifyCommand } = require('../dto');
    const command = new VerifyCommand({ sessionId, phoneNumber, countryCode, deviceInfo });
    return this._verifyUseCase.execute(verificationType, command);
  }

  async pollVerificationStatus(verificationType, sessionId) {
    return this._pollVerificationUseCase.execute(verificationType, sessionId);
  }

  async getProfile(userId) {
    return this._getCurrentUserUseCase.execute(userId);
  }
}

module.exports = AuthFacade;
