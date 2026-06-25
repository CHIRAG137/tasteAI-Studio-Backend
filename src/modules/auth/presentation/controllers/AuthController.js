'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');
const AuthProviderTypes = require('../../infrastructure/providers/AuthProviderTypes');

class AuthController {
  constructor({ authFacade }) {
    this.authFacade = authFacade;
  }

  static _requestMeta(req) {
    return {
      ip: req.clientIp || req.ip || 'Unknown',
      userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
      deviceId: req.body?.deviceId || null,
    };
  }

  register = async (req, res) => {
    const result = await this.authFacade.register({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      ...AuthController._requestMeta(req),
    });

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
    const result = await this.authFacade.login({
      email: req.body.email,
      password: req.body.password,
      ...AuthController._requestMeta(req),
    });

    return ApiResponse.success(res, result, 'Login successful');
  };

  googleLogin = async (req, res) => {
    const result = await this.authFacade.oauthLogin(
      { token: req.body.token, ...AuthController._requestMeta(req) },
      AuthProviderTypes.GOOGLE,
    );

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
    const result = await this.authFacade.oauthLogin(
      { accessToken: req.body.accessToken, ...AuthController._requestMeta(req) },
      AuthProviderTypes.AUTH0,
    );

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
    const result = await this.authFacade.refresh(req.body.refreshToken);
    return ApiResponse.success(res, result, 'Token refreshed');
  };

  verifyQr = async (req, res) => {
    const sessionId = req.body?.sessionId || req.query?.sessionId;
    const phoneNumber = req.body?.phoneNumber || req.query?.phoneNumber;
    const countryCode = req.body?.countryCode || req.query?.countryCode;

    await this.authFacade.verifyQr({
      sessionId,
      phoneNumber,
      countryCode,
      deviceInfo: {
        userAgent: req.userAgent || req.headers['user-agent'] || 'Unknown',
        platform: req.headers['x-device-platform'] || null,
        model: req.headers['x-device-model'] || null,
        os: req.headers['x-device-os'] || null,
        ip: req.clientIp,
      },
    });

    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Account Verified</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; color: #1f2937; }
            .card { text-align: center; padding: 2.5rem; background: white; border-radius: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e5e7eb; max-width: 90%; width: 400px; }
            .icon-wrapper { display: inline-flex; align-items: center; justify-content: center; width: 4rem; height: 4rem; background-color: #d1fae5; color: #059669; border-radius: 9999px; margin-bottom: 1.5rem; font-size: 2rem; font-weight: bold; }
            h1 { font-size: 1.75rem; margin: 0 0 0.75rem 0; font-weight: 800; color: #111827; }
            p { color: #4b5563; font-size: 1rem; line-height: 1.6; margin: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">\u2713</div>
            <h1>Account Activated!</h1>
            <p>Your mobile device has verified your session successfully. You can now return to the screen to sign in to your new account.</p>
          </div>
        </body>
        </html>
      `);
    }

    return ApiResponse.success(res, null, 'Mobile verified. Your account is now active.');
  };

  pollQrStatus = async (req, res) => {
    const result = await this.authFacade.pollQrStatus(req.params.sessionId);
    return ApiResponse.success(res, result, 'QR status fetched');
  };

  logout = async (req, res) => {
    await this.authFacade.logout({
      userId: req.user.id,
      refreshToken: req.body?.refreshToken,
    });
    return ApiResponse.success(res, null, 'Logged out successfully');
  };

  me = async (req, res) => {
    const profile = await this.authFacade.getProfile(req.user.id);
    return ApiResponse.success(res, profile, 'Profile fetched');
  };
}

module.exports = AuthController;
