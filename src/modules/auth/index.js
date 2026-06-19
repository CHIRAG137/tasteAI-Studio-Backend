'use strict';

// ── Domain ─────────────────────────────────────────────────────────────────────
const AuthProviderFactory = require('./domain/factories/AuthProviderFactory');
const AuthProviderTypes = require('./domain/providers/AuthProviderTypes');

// ── Infrastructure — Redis ─────────────────────────────────────────────────────
const AuthRedisClient = require('./infrastructure/redis/AuthRedisClient');

// ── Infrastructure — Token ─────────────────────────────────────────────────────
const JwtSigner = require('./infrastructure/token/JwtSigner');
const AuthTokenStore = require('./infrastructure/token/AuthTokenStore');
const JwtTokenService = require('./infrastructure/token/JwtTokenService');

// ── Infrastructure — Session ───────────────────────────────────────────────────
const RedisSessionService = require('./infrastructure/cache/RedisSessionService');

// ── Infrastructure — QR ───────────────────────────────────────────────────────
const RedisQrService = require('./infrastructure/qr/RedisQrService');

// ── Infrastructure — Persistence ──────────────────────────────────────────────
const MongoUserRepository = require('./infrastructure/persistence/MongoUserRepository');

// ── Infrastructure — Security ─────────────────────────────────────────────────
const BcryptPasswordHasher = require('./infrastructure/security/BcryptPasswordHasher');

// ── Infrastructure — OAuth ────────────────────────────────────────────────────
const EmailPasswordAuthProvider = require('./infrastructure/oauth/EmailPasswordAuthProvider');
const GoogleAuthProvider = require('./infrastructure/oauth/GoogleAuthProvider');
const Auth0AuthProvider = require('./infrastructure/oauth/Auth0AuthProvider');

// ── Infrastructure — Event Bus ────────────────────────────────────────────────
const InMemoryEventBus = require('./infrastructure/eventbus/InMemoryEventBus');

// ── Auth Config ───────────────────────────────────────────────────────────────
const { googleClient, clientId: googleClientId } = require('./config/googleOAuthClient');
const { verifyAuth0AccessToken } = require('./config/auth0Client');
const { env } = require('../../config/env');

// ── Application — Use Cases ───────────────────────────────────────────────────
const RegisterUserUseCase = require('./application/usecases/RegisterUserUseCase');
const LoginUserUseCase = require('./application/usecases/LoginUserUseCase');
const OAuthLoginUseCase = require('./application/usecases/OAuthLoginUseCase');
const RefreshTokenUseCase = require('./application/usecases/RefreshTokenUseCase');
const LogoutUserUseCase = require('./application/usecases/LogoutUserUseCase');
const VerifyQrUseCase = require('./application/usecases/VerifyQrUseCase');
const PollQrStatusUseCase = require('./application/usecases/PollQrStatusUseCase');
const GetCurrentUserUseCase = require('./application/queries/GetCurrentUserUseCase');

// ── API ───────────────────────────────────────────────────────────────────────
const AuthController = require('./api/controllers/AuthController');
const AuthMiddleware = require('./middleware/AuthMiddleware');
const createAuthRoutes = require('./api/routes/auth.routes');

/**
 * Composition root for the auth module.
 *
 * Wires all dependencies using constructor injection.
 * No module instantiates its own dependencies — everything flows through here.
 *
 * Dependency graph (bottom → top):
 *
 *   env config
 *     └─ AuthRedisClient (wraps shared getRedis())
 *         ├─ AuthTokenStore (Redis session ops)
 *         └─ RedisQrService (QR session ops)
 *   JwtSigner (pure JWT crypto)
 *     └─ JwtTokenService (orchestrates signer + store)
 *   AuthTokenStore
 *     └─ RedisSessionService (validates sessions)
 *   MongoUserRepository
 *     ├─ JwtTokenService
 *     ├─ RedisQrService
 *     ├─ RegisterUserUseCase
 *     └─ GetCurrentUserUseCase
 *   AuthProviderFactory
 *     └─ LoginUserUseCase, OAuthLoginUseCase
 *
 * @returns {object} Public module surface: { router, authMiddleware, services... }
 */
function createAuthModule() {
  // ── Infrastructure layer ────────────────────────────────────────────────────

  // Redis
  const redisClient = new AuthRedisClient();

  // Token crypto + session persistence
  const jwtSigner = new JwtSigner();
  const tokenStore = new AuthTokenStore(redisClient);

  // Persistence
  const userRepository = new MongoUserRepository();

  // Services
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(userRepository, jwtSigner, tokenStore);
  const sessionService = new RedisSessionService(tokenStore);
  const qrService = new RedisQrService(userRepository, redisClient);
  const eventBus = new InMemoryEventBus();

  // ── Auth Providers (Strategy pattern) ──────────────────────────────────────
  // Providers are registered conditionally — the app starts cleanly even when
  // optional OAuth credentials are absent in .env
  const authProviderFactory = new AuthProviderFactory();

  // Email + password — always available
  authProviderFactory.register(new EmailPasswordAuthProvider(userRepository, passwordHasher));

  // Google OAuth — only when GOOGLE_CLIENT_ID is configured
  if (env.GOOGLE_CLIENT_ID) {
    authProviderFactory.register(new GoogleAuthProvider(googleClient(), googleClientId()));
  }

  // Auth0 — only when AUTH0_DOMAIN is configured
  if (env.AUTH0_DOMAIN) {
    authProviderFactory.register(new Auth0AuthProvider(verifyAuth0AccessToken, env.AUTH0_DOMAIN));
  }

  // ── Application layer (Use Cases) ──────────────────────────────────────────
  const registerUserUseCase = new RegisterUserUseCase({
    userRepository,
    qrService,
    eventBus,
    passwordHasher,
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

  // ── API layer ───────────────────────────────────────────────────────────────
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

  // ── Public module surface ───────────────────────────────────────────────────
  return {
    router,
    authMiddleware,
    // Expose services for cross-module use (e.g. other modules needing token validation)
    userRepository,
    tokenService,
    sessionService,
    qrService,
    tokenStore,
    jwtSigner,
    eventBus,
    authProviderFactory,
  };
}

module.exports = { createAuthModule, AuthProviderTypes };
