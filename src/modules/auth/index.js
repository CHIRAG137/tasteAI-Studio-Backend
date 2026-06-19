'use strict';

const AuthProviderFactory = require('./domain/factories/AuthProviderFactory');
const AuthProviderTypes = require('./domain/providers/AuthProviderTypes');
const AuthRedisClient = require('./infrastructure/redis/AuthRedisClient');
const JwtSigner = require('./infrastructure/token/JwtSigner');
const AuthTokenStore = require('./infrastructure/token/AuthTokenStore');
const JwtTokenService = require('./infrastructure/token/JwtTokenService');
const RedisSessionService = require('./infrastructure/cache/RedisSessionService');
const RedisQrService = require('./infrastructure/qr/RedisQrService');
const MongoUserRepository = require('./infrastructure/persistence/MongoUserRepository');
const BcryptPasswordHasher = require('./infrastructure/security/BcryptPasswordHasher');
const EmailPasswordAuthProvider = require('./infrastructure/oauth/EmailPasswordAuthProvider');
const GoogleAuthProvider = require('./infrastructure/oauth/GoogleAuthProvider');
const Auth0AuthProvider = require('./infrastructure/oauth/Auth0AuthProvider');
const InMemoryEventBus = require('./infrastructure/eventbus/InMemoryEventBus');
const GoogleOAuthClient = require('./config/GoogleOAuthClient');
const Auth0Client = require('./config/Auth0Client');
const RedisClient = require('./config/RedisClient');
const { env } = require('../../config/env');
const RegisterUserUseCase = require('./application/usecases/RegisterUserUseCase');
const LoginUserUseCase = require('./application/usecases/LoginUserUseCase');
const OAuthLoginUseCase = require('./application/usecases/OAuthLoginUseCase');
const RefreshTokenUseCase = require('./application/usecases/RefreshTokenUseCase');
const LogoutUserUseCase = require('./application/usecases/LogoutUserUseCase');
const VerifyQrUseCase = require('./application/usecases/VerifyQrUseCase');
const PollQrStatusUseCase = require('./application/usecases/PollQrStatusUseCase');
const GetCurrentUserQuery = require('./application/queries/GetCurrentUserQuery');
const AuthController = require('./api/controllers/AuthController');
const AuthMiddleware = require('./api/middleware/AuthMiddleware');
const createAuthRoutes = require('./api/routes/AuthRoutes');

/**
 * Composition root for the authentication module.
 * Wires all domain, application, and infrastructure dependencies using constructor injection.
 *
 * @returns {object} Public module interface containing the Express router, middleware, and core services.
 */
function createAuthModule() {
  const redisClient = new RedisClient({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    tls: env.REDIS_TLS,
    url: env.REDIS_URL,
  });
  const authRedisClient = new AuthRedisClient(redisClient);

  const jwtSigner = new JwtSigner();
  const tokenStore = new AuthTokenStore(authRedisClient);
  const userRepository = new MongoUserRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(userRepository, jwtSigner, tokenStore);
  const sessionService = new RedisSessionService(tokenStore);
  const qrService = new RedisQrService(userRepository, authRedisClient);
  const eventBus = new InMemoryEventBus();

  const authProviderFactory = new AuthProviderFactory();
  authProviderFactory.register(new EmailPasswordAuthProvider(userRepository, passwordHasher));

  if (env.GOOGLE_CLIENT_ID) {
    const googleOAuthClient = new GoogleOAuthClient({ clientId: env.GOOGLE_CLIENT_ID });
    authProviderFactory.register(new GoogleAuthProvider(googleOAuthClient));
  }

  if (env.AUTH0_DOMAIN) {
    const auth0Client = new Auth0Client({
      domain: env.AUTH0_DOMAIN,
      audience: env.AUTH0_AUDIENCE,
    });
    authProviderFactory.register(new Auth0AuthProvider(auth0Client));
  }

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
  const getCurrentUserUseCase = new GetCurrentUserQuery({ userRepository });

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

  return {
    router,
    authMiddleware,
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
