'use strict';

const AuthProviderFactory = require('./domain/factories/AuthProviderFactory');
const AuthProviderTypes = require('./domain/providers/AuthProviderTypes');

const MongoUserRepository = require('./infrastructure/persistence/MongoUserRepository');
const RedisSessionService = require('./infrastructure/cache/RedisSessionService');
const JwtTokenService = require('./infrastructure/token/JwtTokenService');
const RedisQrService = require('./infrastructure/qr/RedisQrService');
const InMemoryEventBus = require('./infrastructure/eventbus/InMemoryEventBus');
const BcryptPasswordHasher = require('./infrastructure/security/BcryptPasswordHasher');

const EmailPasswordAuthProvider = require('./infrastructure/oauth/EmailPasswordAuthProvider');
const GoogleAuthProvider = require('./infrastructure/oauth/GoogleAuthProvider');
const Auth0AuthProvider = require('./infrastructure/oauth/Auth0AuthProvider');

const { googleClient, clientId: googleClientId } = require('./config/googleOAuthClient');
const { verifyAuth0AccessToken } = require('./config/auth0Client');
const { env } = require('../../config/env');

const RegisterUserUseCase = require('./application/usecases/RegisterUserUseCase');
const LoginUserUseCase = require('./application/usecases/LoginUserUseCase');
const OAuthLoginUseCase = require('./application/usecases/OAuthLoginUseCase');
const RefreshTokenUseCase = require('./application/usecases/RefreshTokenUseCase');
const LogoutUserUseCase = require('./application/usecases/LogoutUserUseCase');
const VerifyQrUseCase = require('./application/usecases/VerifyQrUseCase');
const PollQrStatusUseCase = require('./application/usecases/PollQrStatusUseCase');
const GetCurrentUserUseCase = require('./application/queries/GetCurrentUserUseCase');

const AuthController = require('./api/controllers/AuthController');
const AuthMiddleware = require('./middleware/AuthMiddleware');
const createAuthRoutes = require('./api/routes/auth.routes');

/**
 * Factory that wires up and returns the fully composed auth module.
 *
 * All dependency injection happens here — no module imports its own concrete
 * implementations directly. This keeps each layer testable in isolation.
 *
 * Returns the public surface of the module:
 *   - router       → mount on the Express app
 *   - authMiddleware → use on other modules' protected routes
 *   - services     → expose for cross-module use (e.g. token validation)
 *
 * @returns {object}
 */
function createAuthModule() {
  // ── Infrastructure ─────────────────────────────────────────────────────────
  const userRepository = new MongoUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const sessionService = new RedisSessionService();

  // JwtTokenService and RedisQrService now receive userRepository
  // so they never import UserModel directly.
  const tokenService = new JwtTokenService(userRepository);
  const qrService = new RedisQrService(userRepository);
  const eventBus = new InMemoryEventBus();

  // ── Auth Providers (Strategy pattern) ─────────────────────────────────────
  const authProviderFactory = new AuthProviderFactory();

  authProviderFactory.register(new EmailPasswordAuthProvider(userRepository, passwordHasher));

  authProviderFactory.register(new GoogleAuthProvider(googleClient(), googleClientId()));

  authProviderFactory.register(new Auth0AuthProvider(verifyAuth0AccessToken, env.AUTH0_DOMAIN));

  // ── Use Cases ──────────────────────────────────────────────────────────────
  const registerUserUseCase = new RegisterUserUseCase({
    userRepository,
    qrService,
    eventBus,
    passwordHasher, // application layer uses the IPasswordHasher port
  });

  const loginUserUseCase = new LoginUserUseCase({
    authProviderFactory,
    tokenService,
    eventBus,
  });

  const oauthLoginUseCase = new OAuthLoginUseCase({
    authProviderFactory,
    userRepository,
    tokenService,
    qrService,
    eventBus,
  });

  const refreshTokenUseCase = new RefreshTokenUseCase({ tokenService });
  const logoutUserUseCase = new LogoutUserUseCase({ tokenService, eventBus });
  const verifyQrUseCase = new VerifyQrUseCase({ qrService });
  const pollQrStatusUseCase = new PollQrStatusUseCase({ qrService });
  const getCurrentUserUseCase = new GetCurrentUserUseCase({ userRepository });

  // ── API Layer ──────────────────────────────────────────────────────────────
  const authController = new AuthController({
    loginUserUseCase,
    registerUserUseCase,
    oauthLoginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyQrUseCase,
    pollQrStatusUseCase,
    getCurrentUserUseCase,
  });

  const authMiddleware = new AuthMiddleware({
    tokenService,
    sessionService,
    userRepository,
  });

  const router = createAuthRoutes({ authController, authMiddleware });

  // ── Public Module Surface ──────────────────────────────────────────────────
  return {
    router,
    authMiddleware,
    // Expose services for use by other modules
    userRepository,
    tokenService,
    sessionService,
    qrService,
    eventBus,
    authProviderFactory,
  };
}

module.exports = { createAuthModule, AuthProviderTypes };
