'use strict';

const AuthRedisClient = require('./infrastructure/redis/AuthRedisClient');
const BcryptPasswordHasher = require('./infrastructure/services/BcryptPasswordHasher');
const JwtSigner = require('./infrastructure/services/JwtSigner');
const AuthTokenStore = require('./infrastructure/redis/AuthTokenStore');
const JwtTokenService = require('./infrastructure/services/JwtTokenService');
const RedisSessionService = require('./infrastructure/redis/RedisSessionService');
const RedisQrService = require('./infrastructure/qr/RedisQrService');
const PhoneService = require('./infrastructure/qr/PhoneService');
const MongoUserRepository = require('./infrastructure/repositories/MongoUserRepository');
const InMemoryEventBus = require('./infrastructure/services/InMemoryEventBus');
const GoogleOAuthClient = require('./infrastructure/providers/clients/GoogleOAuthClient');
const Auth0Client = require('./infrastructure/providers/clients/Auth0Client');
const RedisClient = require('./infrastructure/redis/RedisClient');
const { env } = require('../../config/env');

const AuthStrategyFactory = require('./infrastructure/strategies/auth/AuthStrategyFactory');
const AuthProviderType = require('./infrastructure/strategies/auth/AuthProviderType');
const EmailPasswordStrategy = require('./infrastructure/strategies/auth/EmailPasswordStrategy');
const GoogleStrategy = require('./infrastructure/strategies/auth/GoogleStrategy');
const Auth0Strategy = require('./infrastructure/strategies/auth/Auth0Strategy');
const QrVerificationStrategy = require('./infrastructure/strategies/verification/QrVerificationStrategy');
const VerificationStrategyFactory = require('./infrastructure/strategies/verification/VerificationStrategyFactory');
const VerificationService = require('./application/services/VerificationService');

const LoginUseCase = require('./application/usecases/LoginUseCase');
const RegisterUseCase = require('./application/usecases/RegisterUseCase');
const RefreshTokenUseCase = require('./application/usecases/RefreshTokenUseCase');
const LogoutUserUseCase = require('./application/usecases/LogoutUserUseCase');
const VerifyVerificationUseCase = require('./application/usecases/VerifyVerificationUseCase');
const PollVerificationUseCase = require('./application/usecases/PollVerificationUseCase');
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
  const phoneService = new PhoneService(userRepository, authRedisClient);
  const qrService = new RedisQrService(userRepository, authRedisClient, phoneService);
  const eventBus = new InMemoryEventBus();

  // Verification — Strategy pattern (QR today, magic link/email tomorrow)
  const verificationStrategyFactory = new VerificationStrategyFactory();
  verificationStrategyFactory.register(new QrVerificationStrategy(qrService));
  // Future: verificationStrategyFactory.register(new MagicLinkVerificationStrategy(emailService));

  const verificationService = new VerificationService({
    factory: verificationStrategyFactory,
    defaultType: 'qr',
  });

  // Register auth strategies (Strategy pattern — one per provider)
  const authStrategyFactory = new AuthStrategyFactory();
  authStrategyFactory.register(
    new EmailPasswordStrategy({
      userRepository,
      passwordHasher,
      tokenService,
      verificationService,
    }),
  );

  if (env.GOOGLE_CLIENT_ID) {
    const googleOAuthClient = new GoogleOAuthClient({ clientId: env.GOOGLE_CLIENT_ID });
    authStrategyFactory.register(
      new GoogleStrategy({
        userRepository,
        tokenService,
        verificationService,
        eventBus,
        googleOAuthClient,
      }),
    );
  }

  if (env.AUTH0_DOMAIN) {
    const auth0Client = new Auth0Client({
      domain: env.AUTH0_DOMAIN,
      audience: env.AUTH0_AUDIENCE,
    });
    authStrategyFactory.register(
      new Auth0Strategy({
        userRepository,
        tokenService,
        verificationService,
        eventBus,
        auth0Client,
      }),
    );
  }

  // Use cases
  const loginUseCase = new LoginUseCase({ authStrategyFactory });
  const registerUseCase = new RegisterUseCase({ authStrategyFactory });
  const refreshTokenUseCase = new RefreshTokenUseCase({ tokenService });
  const logoutUserUseCase = new LogoutUserUseCase({ tokenService });
  const verifyUseCase = new VerifyVerificationUseCase({ verificationService });
  const pollVerificationUseCase = new PollVerificationUseCase({ verificationService });
  const getCurrentUserUseCase = new GetCurrentUserUseCase({ userRepository });

  const authFacade = new AuthFacade({
    registerUseCase,
    loginUseCase,
    refreshTokenUseCase,
    logoutUserUseCase,
    verifyUseCase,
    pollVerificationUseCase,
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
    authStrategyFactory,
  };
}

module.exports = { createAuthModule, AuthProviderTypes: AuthProviderType };
