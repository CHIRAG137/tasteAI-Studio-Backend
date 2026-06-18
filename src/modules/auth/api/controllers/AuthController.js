'use strict';

const LoginCommand = require('../../application/dto/LoginCommand');
const RegisterCommand = require('../../application/dto/RegisterCommand');
const RefreshTokenCommand = require('../../application/dto/RefreshTokenCommand');
const LogoutCommand = require('../../application/dto/LogoutCommand');
const VerifyQrCommand = require('../../application/dto/VerifyQrCommand');
const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');
const ApiResponse = require('../../../shared/response/ApiResponse');

/**
 * HTTP controller for all auth endpoints.
 *
 * Responsibilities:
 *   - Extract and validate HTTP inputs (handled by validators upstream)
 *   - Construct command/query objects and delegate to use cases
 *   - Map use case results to HTTP responses via ApiResponse
 *
 * No business logic lives here. Errors are handled by the global error middleware
 * via asyncHandler — no try/catch blocks needed.
 */
class AuthController {
  /**
   * @param {object} useCases
   */
  constructor({
    loginUserUseCase,
    registerUserUseCase,
    oauthLoginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyQrUseCase,
    pollQrStatusUseCase,
    getCurrentUserUseCase,
  }) {
    this.loginUserUseCase = loginUserUseCase;
    this.registerUserUseCase = registerUserUseCase;
    this.oauthLoginUseCase = oauthLoginUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.logoutUserUseCase = logoutUserUseCase;
    this.verifyQrUseCase = verifyQrUseCase;
    this.pollQrStatusUseCase = pollQrStatusUseCase;
    this.getCurrentUserUseCase = getCurrentUserUseCase;
  }

  /** Extracts request metadata shared across login and register flows. @private */
  static _requestMeta(req) {
    return {
      ip: req.clientIp || req.ip || 'Unknown',
      userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
      deviceId: req.body?.deviceId || null,
    };
  }

  register = async (req, res) => {
    const command = new RegisterCommand({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      ...AuthController._requestMeta(req),
    });

    const result = await this.registerUserUseCase.execute(command);

    if (result.linked) {
      return ApiResponse.success(res, result, 'Password linked to existing account');
    }

    return ApiResponse.created(
      res,
      result,
      'Registration successful. Please scan the QR code with your mobile device to activate your account.',
    );
  };

  login = async (req, res) => {
    const command = new LoginCommand({
      email: req.body.email,
      password: req.body.password,
      ...AuthController._requestMeta(req),
    });

    const result = await this.loginUserUseCase.execute(command);
    return ApiResponse.success(res, result, 'Login successful');
  };

  googleLogin = async (req, res) => {
    const command = new LoginCommand({
      token: req.body.token,
      ...AuthController._requestMeta(req),
    });

    const result = await this.oauthLoginUseCase.execute(command, AuthProviderTypes.GOOGLE);

    if (result.qrRequired) {
      return ApiResponse.created(
        res,
        result,
        'Google account created. Please scan the QR code to activate your account.',
      );
    }

    return ApiResponse.success(res, result, 'Google login successful');
  };

  auth0Login = async (req, res) => {
    const command = new LoginCommand({
      accessToken: req.body.accessToken,
      ...AuthController._requestMeta(req),
    });

    const result = await this.oauthLoginUseCase.execute(command, AuthProviderTypes.AUTH0);

    if (result.qrRequired) {
      return ApiResponse.created(
        res,
        result,
        'Auth0 account created. Please scan the QR code to activate your account.',
      );
    }

    return ApiResponse.success(res, result, 'Auth0 login successful');
  };

  refresh = async (req, res) => {
    const command = new RefreshTokenCommand({
      refreshToken: req.body.refreshToken,
    });

    const result = await this.refreshTokenUseCase.execute(command);
    return ApiResponse.success(res, result, 'Token refreshed');
  };

  verifyQr = async (req, res) => {
    const command = new VerifyQrCommand({
      sessionId: req.body.sessionId,
      phoneNumber: req.body.phoneNumber,
      countryCode: req.body.countryCode,
      deviceInfo: {
        userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
        platform: req.headers['x-device-platform'] || null,
        model: req.headers['x-device-model'] || null,
        os: req.headers['x-device-os'] || null,
        ip: req.clientIp,
      },
    });

    await this.verifyQrUseCase.execute(command);
    return ApiResponse.success(res, null, 'Mobile verified. Your account is now active.');
  };

  pollQrStatus = async (req, res) => {
    const result = await this.pollQrStatusUseCase.execute(req.params.sessionId);
    return ApiResponse.success(res, result, 'QR status fetched');
  };

  logout = async (req, res) => {
    const command = new LogoutCommand({
      userId: req.user.id,
      refreshToken: req.body?.refreshToken,
    });

    await this.logoutUserUseCase.execute(command);
    return ApiResponse.success(res, null, 'Logged out successfully');
  };

  me = async (req, res) => {
    const profile = await this.getCurrentUserUseCase.execute(req.user.id);
    return ApiResponse.success(res, profile, 'Profile fetched');
  };
}

module.exports = AuthController;
