'use strict';

const AuthProviderFactory = require('./infrastructure/providers/AuthProviderFactory');
const AuthProviderTypes = require('./infrastructure/providers/AuthProviderTypes');
const AuthRedisClient = require('./infrastructure/redis/AuthRedisClient');
const JwtSigner = require('./infrastructure/strategies/JwtSigner');
const AuthTokenStore = require('./infrastructure/strategies/AuthTokenStore');
const JwtTokenService = require('./infrastructure/strategies/JwtTokenService');
const RedisSessionService = require('./infrastructure/strategies/RedisSessionService');
const RedisQrService = require('./infrastructure/strategies/RedisQrService');
const MongoUserRepository = require('./infrastructure/repositories/MongoUserRepository');
const BcryptPasswordHasher = require('./infrastructure/strategies/BcryptPasswordHasher');
const EmailPasswordAuthProvider = require('./infrastructure/providers/EmailPasswordAuthProvider');
const GoogleAuthProvider = require('./infrastructure/providers/GoogleAuthProvider');
const Auth0AuthProvider = require('./infrastructure/providers/Auth0AuthProvider');
const InMemoryEventBus = require('./infrastructure/strategies/InMemoryEventBus');
const GoogleOAuthClient = require('./infrastructure/config/GoogleOAuthClient');
const Auth0Client = require('./infrastructure/config/Auth0Client');
const RedisClient = require('./infrastructure/config/RedisClient');
const { env } = require('../../config/env');
const RegisterUserUseCase = require('./application/usecases/RegisterUserUseCase');
const LoginUserUseCase = require('./application/usecases/LoginUserUseCase');
const OAuthLoginUseCase = require('./application/usecases/OAuthLoginUseCase');
const RefreshTokenUseCase = require('./application/usecases/RefreshTokenUseCase');
const LogoutUserUseCase = require('./application/usecases/LogoutUserUseCase');
const VerifyQrUseCase = require('./application/usecases/VerifyQrUseCase');
const PollQrStatusUseCase = require('./application/usecases/PollQrStatusUseCase');
const GetCurrentUserUseCase = require('./application/queries/GetCurrentUserQuery');
const AuthFacade = require('./application/facades/AuthFacade');
const AuthController = require('./presentation/controllers/AuthController');
const AuthMiddleware = require('../shared/middleware/AuthMiddleware');
const createAuthRoutes = require('./presentation/routes/AuthRoutes');

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
  const logoutUserUseCase = new LogoutUserUseCase({ tokenService });
  const verifyQrUseCase = new VerifyQrUseCase({ qrService });
  const pollQrStatusUseCase = new PollQrStatusUseCase({ qrService });
  const getCurrentUserUseCase = new GetCurrentUserUseCase({ userRepository });

  const authFacade = new AuthFacade({
    registerUserUseCase,
    loginUserUseCase,
    oauthLoginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyQrUseCase,
    pollQrStatusUseCase,
    getCurrentUserUseCase,
  });

  const authController = new AuthController({ authFacade });

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
