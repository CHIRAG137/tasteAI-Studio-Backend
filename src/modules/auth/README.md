# tasteAI Studio — Auth Module

This is the identity and access control piece of tasteAI Studio. It handles who gets in, how they get in, how they stay logged in, and how they prove who they are to the rest of the system. Every user — whether they sign up with email, Google, or Auth0 — goes through this module.

It runs as either a standalone service or plugged into the main Express app. Either way, it exports a plain router that you mount wherever you want.

---

## What it does

- Sign up and sign in with email + password
- Sign in with Google (ID token or access token)
- Sign in with Auth0
- QR-code-based account activation — new accounts start inactive; you have to scan a QR from the mobile app to activate
- JWT access tokens (short-lived) + refresh tokens (long-lived, rotated on every use)
- Redis-backed token storage, session validation, and refresh token family tracking
- Rate limiting on login and QR endpoints
- Getting the current user's profile

It does **not** do authorization beyond telling you who the user is. Fine-grained access control (roles, permissions, feature flags) lives in other modules, but they use the `AuthMiddleware` from here to check identity.

---

## How it's structured

The code is split into four layers. The rule is simple: inner layers never import from outer layers.

```
presentation/  →  application/  →  domain/  →  infrastructure/
```

The infrastructure layer is at the edge — it talks to MongoDB, Redis, Google, Auth0. Everything else stays pure.

### Why this layout

The module uses Clean Architecture's layer separation so infrastructure concerns (MongoDB, Redis, OAuth) can change without affecting business logic. Key patterns:

- **Facade** — controllers talk to one object (`AuthFacade`) instead of eight different use cases
- **Strategy** — each provider (email/password, Google, Auth0) is a registered `AuthStrategy`; verification methods (QR, SMS) are registered `VerificationStrategy` instances
- **Repository** — the database is behind a plain JS object; use cases call `findByEmail()` and don't care if it's Mongo or Postgres
- **Command (DTO)** — data crosses from controllers to use cases in immutable command objects, not raw `req.body`

The result is that a use case reads top to bottom without Express middleware, Mongoose queries, or JWT internals getting in the way.

---

## Folder layout

```
src/modules/auth/
├── index.js                          # Wires everything together (composition root)
├── standalone.js                     # Standalone Express server
│
├── application/                      # What the app actually does
│   ├── dto/                          # Command objects — immutable, no logic
│   │   ├── index.js                  # Barrel exports
│   │   ├── LoginCommand.js
│   │   ├── LogoutCommand.js
│   │   ├── RefreshTokenCommand.js
│   │   ├── RegisterCommand.js
│   │   └── VerifyCommand.js
│   ├── facades/
│   │   └── AuthFacade.js             # The one thing controllers import
│   ├── mappers/
│   │   └── AuthResponseMapper.js     # Shapes responses consistently
│   ├── queries/
│   │   └── GetCurrentUserQuery.js    # Fetch profile (read-only)
│   ├── services/
│   │   └── VerificationService.js    # Facade over VerificationStrategyFactory
│   └── usecases/                     # One file per operation
│       ├── LoginUseCase.js           # Generic — delegates to AuthStrategy
│       ├── RegisterUseCase.js        # Generic — delegates to AuthStrategy
│       ├── LogoutUserUseCase.js
│       ├── PollVerificationUseCase.js
│       ├── RefreshTokenUseCase.js
│       └── VerifyVerificationUseCase.js
│
├── domain/
│   ├── contracts/                    # Interface definitions
│   │   └── IUserRepository.js
│   └── User.js                       # Plain class with fields and toPublicProfile()
│
├── infrastructure/                   # Everything external lives here
│   ├── mappers/
│   │   └── UserMapper.js             # Converts between Mongo docs and User objects
│   ├── persistence/
│   │   └── UserModel.js              # Mongoose schema + model
│   ├── providers/
│   │   └── clients/                  # OAuth SDK wrappers
│   │       ├── GoogleOAuthClient.js
│   │       └── Auth0Client.js
│   ├── qr/                           # QR session management
│   │   ├── QrKeyScheme.js
│   │   ├── QrUtils.js
│   │   ├── RedisQrService.js
│   │   └── PhoneService.js
│   ├── redis/                        # Redis connection + token storage
│   │   ├── AuthRedisClient.js
│   │   ├── AuthRedisKeyScheme.js
│   │   ├── AuthTokenStore.js
│   │   ├── RedisClient.js            # Connection manager
│   │   └── RedisSessionService.js    # Access token validation
│   ├── repositories/
│   │   └── MongoUserRepository.js    # Database access — implements IUserRepository
│   ├── services/                     # Swappable algorithms & shared services
│   │   ├── BcryptPasswordHasher.js
│   │   ├── InMemoryEventBus.js
│   │   ├── JwtSigner.js
│   │   └── JwtTokenService.js
│   ├── strategies/                   # Strategy pattern — auth providers + verification methods
│   │   ├── auth/                     # Per-provider login/register strategies
│   │   │   ├── AuthStrategy.js           # Base class (authenticate, login, register)
│   │   │   ├── AuthStrategyFactory.js    # Registry of strategies by provider type
│   │   │   ├── AuthProviderType.js       # Enum constants
│   │   │   ├── EmailPasswordStrategy.js
│   │   │   ├── OAuthStrategy.js          # Shared base for OAuth flows
│   │   │   ├── GoogleStrategy.js
│   │   │   └── Auth0Strategy.js
│   │   └── verification/             # Per-method verification strategies
│   │       ├── VerificationStrategy.js           # Base class (type, createVerification, verify, pollStatus)
│   │       ├── VerificationStrategyFactory.js    # Registry of strategies by type
│   │       └── QrVerificationStrategy.js         # QR implementation (type: 'qr')
│
├── presentation/                     # HTTP layer
│   ├── controllers/
│   │   └── AuthController.js
│   ├── middleware/
│   │   └── IpMiddleware.js
│   ├── routes/
│   │   └── AuthRoutes.js
│   └── validators/
│       └── AuthValidator.js
```

Shared code (exceptions, logger, auth middleware, response helpers) lives in `src/modules/shared/` so other modules can use it too.

---

## Strategy patterns

There are three distinct strategy patterns in this module. They serve different purposes and have different extension points.

| Pattern                   | What it does                                        | Multiple instances?      | Registry?                     | Consumer                                                |
| ------------------------- | --------------------------------------------------- | ------------------------ | ----------------------------- | ------------------------------------------------------- |
| **Auth Strategy**         | Per-provider login/register (email, Google, Auth0)  | Yes — one per provider   | `AuthStrategyFactory`         | Use cases (via factory)                                 |
| **Verification Strategy** | Per-method account activation (QR, SMS, magic link) | Yes — one per method     | `VerificationStrategyFactory` | Auth strategies + use cases (via `VerificationService`) |
| **Injectable Strategy**   | Swappable algorithm (bcrypt, JWT, Redis)            | No — one active instance | N/A                           | Injected into constructors directly                     |

---

### Auth Strategies (per-provider login/register)

#### What is an Auth Strategy?

An **Auth Strategy** is a per-provider implementation of login and register. One class per authentication provider (email/password, Google, Auth0, Apple, GitHub, etc.), encapsulating the full lifecycle:

- `authenticate(command)` — verify credentials (token validation, password check)
- `login(command)` — full login flow (authenticate → find/create user → issue tokens or require verification)
- `register(command)` — explicit registration (only email/password by default; OAuth providers create users on first login)

All auth strategies extend `AuthStrategy` and are registered in `AuthStrategyFactory`. `LoginUseCase` and `RegisterUseCase` are generic — they look up the strategy by provider type and delegate. Adding a new provider means adding one new class and registering it. No use cases, no handlers, no controllers change.

#### Current auth strategies

| Provider type    | Class                   | File                                                      | What it does                                                                                                                                                        |
| ---------------- | ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email_password` | `EmailPasswordStrategy` | `infrastructure/strategies/auth/EmailPasswordStrategy.js` | Authenticates via bcrypt, issues tokens for active users, creates users with verification activation on register.                                                   |
| `google`         | `GoogleStrategy`        | `infrastructure/strategies/auth/GoogleStrategy.js`        | Extends `OAuthStrategy`. Verifies Google ID token, creates/enriches users with `googleId`/`googleProfile`, follows verification activation for new users.           |
| `auth0`          | `Auth0Strategy`         | `infrastructure/strategies/auth/Auth0Strategy.js`         | Extends `OAuthStrategy`. Verifies Auth0 access token via JWKS, creates/enriches users with `auth0Id`/`auth0Profile`, follows verification activation for new users. |

#### AuthStrategy interface

```js
class AuthStrategy {
  getType()                        // → string
  async authenticate(command)      // verify credentials
  async login(command)             // full login flow
  async register(command)          // explicit registration (optional — base throws)
}
```

The base class throws on every method — unimplemented methods surface clear errors at runtime.

#### OAuthStrategy base

OAuth providers share the same `login()` flow (authenticate → extract profile → find-or-create → verify or token-issue). Extend `OAuthStrategy` and implement only the provider-specific parts:

```js
class OAuthStrategy extends AuthStrategy {
  get oauthIdField()               // → string, e.g. 'googleId'
  async authenticate(command)     // verify OAuth token
  _extractProfile(authResult)     // normalize provider profile
  _createUserFromProfile(profile) // DB insert for new user
  _enrichExistingUser(user, profile) // DB update for returning user
  // login(), _handleNewUserFlow(), _handleExistingUserFlow() — inherited
}
```

#### How to add a new provider strategy

Let's say you want to add **Apple Sign-In**. Here is every file you need to touch:

1. **`infrastructure/strategies/auth/AuthProviderType.js`** — add the constant

   ```js
   APPLE: 'apple',
   ```

2. **`infrastructure/providers/clients/AppleClient.js`** — create an SDK client wrapper
   Encapsulates token verification against Apple's JWKS endpoint. Follow the `GoogleOAuthClient` / `Auth0Client` pattern.

3. **`infrastructure/strategies/auth/AppleStrategy.js`** — create the strategy
   If it's an OAuth provider, extend `OAuthStrategy` and implement:
   - `getType()` → `'apple'`
   - `authenticate(command)` — verify Apple token, return `{ profile }`
   - `_extractProfile(authResult)` — normalize to `{ oauthId, email, name, picture, ... }`
   - `_createUserFromProfile(profile)` — create user in DB with Apple-specific fields
   - `_enrichExistingUser(user, profile)` — update user with new Apple profile data

   The base `OAuthStrategy` handles the rest: `login()`, new-user verification flow (via `verificationService`), existing-user token issuance, and active/banned checks.

4. **`infrastructure/persistence/UserModel.js`** — add schema fields
   - Add `appleId` (indexed, sparse)
   - Add `appleProfile` sub-schema (following `googleProfile` / `auth0Profile` pattern)
   - The `authMethods` enum constraint has been removed — new values work automatically

5. **`index.js`** — register the strategy (conditionally, based on env vars)

   ```js
   if (env.APPLE_CLIENT_ID) {
     const appleClient = new AppleClient({ clientId: env.APPLE_CLIENT_ID });
     authStrategyFactory.register(
       new AppleStrategy({
         userRepository,
         tokenService,
         verificationService,
         eventBus,
         appleClient,
       }),
     );
   }
   ```

6. **`presentation/routes/AuthRoutes.js`** — add `POST /apple-login` with `setAuthProvider(AuthProviderType.APPLE)` middleware, rate limiter, and validator.

7. **`presentation/validators/AuthValidator.js`** — add validation rules for the Apple token payload.

8. **`src/config/env.js`** — add env vars (e.g. `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`).

**If the new provider is password-based** (e.g. SMS OTP): extend `AuthStrategy` directly (not `OAuthStrategy`), implement `authenticate`, `login`, and `register` yourself. No OAuth client needed, no `clients/` entry.

#### How to add a new method to the AuthStrategy interface

Let's say you want every auth strategy to support `resetPassword()`:

1. **Add the default implementation in the base class** (throws by default so existing strategies that haven't implemented it yet fail clearly):

   ```js
   // infrastructure/strategies/auth/AuthStrategy.js
   async resetPassword(command) {
     throw new Error(`resetPassword() not supported for strategy: ${this.getType()}`);
   }
   ```

2. **Override it in the strategies that support it**:

   ```js
   // infrastructure/strategies/auth/EmailPasswordStrategy.js
   async resetPassword(command) {
     const user = await this.userRepository.findByEmail(command.email);
     if (!user) throw new NotFoundException('User not found');
     const hashed = await this.passwordHasher.hash(command.newPassword);
     await this.userRepository.update(user.id, { password: hashed });
   }
   ```

3. **Create or update the use case** to call the new method:

   ```js
   // application/usecases/ResetPasswordUseCase.js
   class ResetPasswordUseCase {
     constructor({ authStrategyFactory }) {
       this.authStrategyFactory = authStrategyFactory;
     }
     async execute(command, providerType) {
       const strategy = this.authStrategyFactory.get(providerType);
       return strategy.resetPassword(command);
     }
   }
   ```

4. **Wire it in `index.js`** — instantiate the use case, pass it to the facade, register routes.

Files changed: `AuthStrategy.js` (1 line default), `EmailPasswordStrategy.js` (override), possibly `OAuthStrategy.js` (override that throws, or implement using a common flow), `ResetPasswordUseCase.js` (create), `AuthFacade.js` (add method), `AuthController.js` (add handler), `AuthRoutes.js` (add route), `index.js` (wire).

---

### Verification Strategies (per-method account activation)

#### What is a Verification Strategy?

A **Verification Strategy** is a per-method implementation of account activation. One class per verification method (QR, SMS, email magic link, etc.), encapsulating:

- `createVerification(userId)` — create a session and return verification data
- `verify(command)` — complete the verification (e.g., code entered, QR scanned)
- `pollStatus(sessionId)` — check the current status (used by the web client waiting for activation)

Unlike auth strategies (one active per login request), verification strategies are called from **two places**: auth strategies (to create a verification on registration/OAuth-first-login) and use cases (to verify and poll). The `VerificationService` facade bridges this by wrapping the factory:

```js
// Strategies only need the service facade — they don't know about the factory
class EmailPasswordStrategy extends AuthStrategy {
  constructor({ verificationService, verificationType, ... }) { ... }
  async register(command) {
    // ...
    const verification = await this.verificationService.createVerification(userId, this.verificationType);
    // ...
  }
}
```

The `verificationType` field on each auth strategy controls which verification method it uses. The default is `'qr'`, configurable per-strategy in `index.js`.

#### VerificationStrategy interface

```js
class VerificationStrategy {
  get type()                       // → string, e.g. 'qr', 'sms', 'magic-link'
  async createVerification(userId) // → { sessionId, expiresAt, ... }
  async verify(command)            // complete the verification
  async pollStatus(sessionId)      // → { status: 'pending' | 'scanned' | 'expired' }
}
```

#### Current verification strategies

| Type | Class                    | File                                                               | What it does                                                                                  |
| ---- | ------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `qr` | `QrVerificationStrategy` | `infrastructure/strategies/verification/QrVerificationStrategy.js` | Creates QR code sessions in Redis; mobile app scans to activate; web client polls for status. |

#### How to add a new verification method

Let's say you want to add **SMS verification** alongside QR:

| File                                                                | Change                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `infrastructure/strategies/verification/SmsVerificationStrategy.js` | **CREATE** — extend `VerificationStrategy`, implement 3 methods + type getter |
| `infrastructure/services/SmsService.js`                             | **CREATE** — the SMS delivery service (Twilio, etc.)                          |
| `index.js`                                                          | **EDIT** — register the new strategy in the factory                           |
| `presentation/routes/AuthRoutes.js`                                 | **EDIT** — add new routes with `setVerificationType('sms')`                   |

```js
// infrastructure/strategies/verification/SmsVerificationStrategy.js
'use strict';

const VerificationStrategy = require('./VerificationStrategy');

class SmsVerificationStrategy extends VerificationStrategy {
  get type() {
    return 'sms';
  }

  constructor(smsService) {
    super();
    this.smsService = smsService;
  }

  async createVerification(userId) {
    return this.smsService.sendCode(userId);
  }

  async verify(command) {
    await this.smsService.verifyCode(command.sessionId, command.code);
  }

  async pollStatus(sessionId) {
    return this.smsService.checkStatus(sessionId);
  }
}

module.exports = SmsVerificationStrategy;
```

Register in `index.js`:

```diff
 const verificationStrategyFactory = new VerificationStrategyFactory();
 verificationStrategyFactory.register(new QrVerificationStrategy(qrService));
+verificationStrategyFactory.register(new SmsVerificationStrategy(smsService));
```

Add routes in `AuthRoutes.js`:

```js
router.post(
  '/verify-sms',
  setVerificationType('sms'),
  authValidator.smsVerifyRules,
  asyncHandler(authController.verify),
);

router.get(
  '/sms-status/:sessionId',
  setVerificationType('sms'),
  asyncHandler(authController.pollVerificationStatus),
);
```

**No changes** to existing strategies, use cases, controllers, auth methods, or the facade.

#### How to add a new method to the VerificationStrategy interface

If you need a capability that all verification methods must support (e.g., `resendCode()`):

1. **Add the default to the base class**:

   ```js
   // infrastructure/strategies/verification/VerificationStrategy.js
   async resendCode(sessionId) {
     throw new Error(`resendCode() not implemented for type: ${this.type}`);
   }
   ```

2. **Implement it in each verification strategy that supports it**:

   ```js
   // infrastructure/strategies/verification/SmsVerificationStrategy.js
   async resendCode(sessionId) {
     return this.smsService.resendCode(sessionId);
   }
   ```

3. **Add a method on `VerificationService`** to expose it:

   ```js
   // application/services/VerificationService.js
   async resendCode(type, sessionId) {
     return this._factory.get(type).resendCode(sessionId);
   }
   ```

4. **Create a use case or call directly** from the controller.

Files changed: `VerificationStrategy.js` (default), each strategy that supports it (override), `VerificationService.js` (pass-through), optionally a new use case or direct route handler.

#### How to switch the default verification method

To make SMS the default for **all** auth methods (instead of QR):

1. Create and register `SmsVerificationStrategy` as above.
2. Change the default in `index.js`:
   ```diff
   - const verificationService = new VerificationService({ factory, defaultType: 'qr' });
   + const verificationService = new VerificationService({ factory, defaultType: 'sms' });
   ```

To make a **specific strategy** use a different verification type, pass `verificationType` in its constructor:

```diff
  authStrategyFactory.register(
    new EmailPasswordStrategy({
      userRepository,
      passwordHasher,
      tokenService,
      verificationService,
+     verificationType: 'sms',   // this strategy uses SMS; others use the default
    }),
  );
```

---

### Injectable Strategies (swappable algorithms)

These strategies are instantiated once and passed to whatever service or use case needs them. There is always exactly **one active implementation** at a time.

| #   | Strategy                | Interface                                                                                                                                                                                                         | Current implementation                                | Used by                           | What it does                                                                    |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| 1   | **Password hasher**     | `hash(plaintext)` → `string`<br>`compare(plaintext, hashed)` → `boolean`                                                                                                                                          | `BcryptPasswordHasher` — bcrypt, 12 salt rounds       | `EmailPasswordStrategy`           | Hashes and verifies user passwords                                              |
| 2   | **JWT signer**          | `signAccessToken(userId, email)` → `string`<br>`verifyAccessToken(token)` → `payload`<br>`createRefreshToken()` → `string`<br>`hashRefreshToken(raw)` → `string`                                                  | `JwtSigner` — HS256 via `jsonwebtoken`                | `JwtTokenService`                 | Signs and verifies JWTs, generates opaque refresh tokens                        |
| 3   | **Token store**         | `storeTokenPair({...})`<br>`validateToken(userId, token)` → `boolean`<br>`lookupRefresh(refreshHash)` → `metadata`<br>`deleteRefresh(refreshHash)`<br>`clearSession(userId, token)`<br>`wipeFamilyTokens(family)` | `AuthTokenStore` — Redis pipeline                     | `JwtTokenService`                 | Persists token tuples server-side for validation, rotation, and theft detection |
| 4   | **Session service**     | `validateAccessToken(userId, token)` → `boolean`                                                                                                                                                                  | `RedisSessionService` — delegates to `AuthTokenStore` | `AuthMiddleware`                  | Checks whether an access token is still valid (not logged out)                  |
| 5   | **Event bus**           | `publish(event)`<br>`subscribe(eventName, handler)`<br>`unsubscribe(eventName, handler)`                                                                                                                          | `InMemoryEventBus` — Node.js `EventEmitter`           | `GoogleStrategy`, `Auth0Strategy` | Carries domain events (e.g. user registered) between use cases and side effects |
| 6   | **Google OAuth client** | `verifyIdToken(idToken)` → `payload`                                                                                                                                                                              | `GoogleOAuthClient` — `google-auth-library`           | `GoogleStrategy`                  | Cryptographically verifies Google ID tokens                                     |
| 7   | **Auth0 OAuth client**  | `verifyAccessToken(token)` → `payload`                                                                                                                                                                            | `Auth0Client` — `jwks-rsa` + `jsonwebtoken`           | `Auth0Strategy`                   | Verifies Auth0 access tokens against the JWKS endpoint                          |

**Note:** `JwtTokenService` (in `services/`) is an **orchestrator** that composes `JwtSigner` + `AuthTokenStore`; `RedisClient` (in `redis/`) is a **connection manager**. They use strategies but aren't swappable algorithms themselves.

#### How to add a new injectable strategy

To replace any injectable strategy (say, swap `BcryptPasswordHasher` for `Argon2PasswordHasher`):

**Files that change:**

| File                                              | Change                                    |
| ------------------------------------------------- | ----------------------------------------- |
| `infrastructure/services/Argon2PasswordHasher.js` | **CREATE** — implement the same interface |
| `index.js`                                        | **EDIT** — swap the instantiation         |

**Step-by-step:**

1. Create the new file implementing the exact same method signatures:

   ```js
   // infrastructure/services/Argon2PasswordHasher.js
   'use strict';

   class Argon2PasswordHasher {
     async hash(plaintext) {
       /* argon2 logic */
     }
     async compare(plaintext, hashed) {
       /* argon2 compare */
     }
   }

   module.exports = Argon2PasswordHasher;
   ```

2. In `index.js`, swap one line:
   ```diff
   - const passwordHasher = new BcryptPasswordHasher();
   + const passwordHasher = new Argon2PasswordHasher();
   ```

**That's it.** Every use case and auth method that calls `passwordHasher.hash()` or `passwordHasher.compare()` now uses Argon2. Zero files other than the two above are touched.

#### How to add a completely new strategy category

If you need a strategy that doesn't fit any existing category (e.g., a rate limiter or an MFA service):

1. **Define the interface** — create a class with the methods your consumers will call
2. **Create the implementation** in the appropriate folder under `infrastructure/`
3. **Inject it** into whichever use case, service, or auth method needs it
4. **Wire it** in `index.js`
5. **If multiple implementations should coexist**, create a factory (see `VerificationStrategyFactory` for the pattern)

---

## Endpoints

All routes are mounted under `/api/auth/user` by default. Protected endpoints need `Authorization: Bearer <accessToken>`.

### POST /register

Creates an account with email and password. Returns a QR code that must be scanned on mobile to activate the account.

```json
{ "email": "user@tasteai.studio", "password": "Str0ng!Pass", "name": "Jane Doe" }
```

Returns 201 with `sessionId`, `qrDataUrl` (base64 PNG), and `expiresAt`.

If the email already exists from a Google or Auth0 login, it links the password to that account instead of creating a duplicate.

### POST /login

```json
{ "email": "user@tasteai.studio", "password": "Str0ng!Pass" }
```

Returns 200 with access token, refresh token, and user profile.

### POST /google-login

```json
{ "token": "ya29.a0AfH6..." }
```

Takes a Google ID token or access token. If the user is new, they get a QR to activate. If they already exist, they get tokens back.

### POST /auth0-login

```json
{ "accessToken": "eyJhbGci..." }
```

Same flow as Google but for Auth0.

### POST /refresh

```json
{ "refreshToken": "a1b2c3..." }
```

Returns a fresh access + refresh token pair. The old refresh token is invalidated.

### POST /logout

Needs auth header. Body:

```json
{ "refreshToken": "a1b2c3..." }
```

Deletes the session from Redis. User has to log in again.

### POST /verify-qr | GET /verify-qr

Used by the mobile app after scanning a QR code. POST for API calls, GET for browser redirects. Required params: `sessionId`. Optional: `phoneNumber` (E.164), `countryCode`, `deviceInfo`.

The `setVerificationType('qr')` middleware routes this to the generic `authController.verify` handler.

### GET /qr-status/:sessionId

Poll this from the web client to check if the QR was scanned. The `setVerificationType('qr')` middleware routes this to the generic `authController.pollVerificationStatus` handler. Returns:

```json
{ "status": "pending" }
// or
{ "status": "scanned" }
// or
{ "status": "expired" }
```

### GET /me

Returns the authenticated user's profile. Needs auth header.

---

## How the flows work

### Account activation (QR method)

1. User registers → account created with `isActive: false`
2. Auth method calls `verificationService.createVerification(userId, 'qr')` → delegates to `QrVerificationStrategy`
3. Server sends back QR data (session ID, QR image, expiry)
4. Web client shows the QR code
5. User opens the mobile app and scans it
6. Mobile app calls `POST /verify-qr` (middleware sets `req.verificationType = 'qr'`) → `VerifyVerificationUseCase` → `QrVerificationStrategy.verify()`
7. Account gets activated, phone gets linked
8. Web client polls `GET /qr-status/:sessionId` (middleware sets `req.verificationType`) → `PollVerificationUseCase` → `QrVerificationStrategy.pollStatus()`
9. Client sees `"scanned"` and lets the user log in

Switching to a different verification method (e.g., magic link) means creating a new strategy, registering it, and adding routes — no changes to the activation flow above.

### Token lifecycle

- **Access tokens** are JWTs, short-lived (15 min by default). Stored in Redis for quick validation.
- **Refresh tokens** are random 64-byte strings, hashed with SHA-256 before storage. Only shown to the client once when issued.
- **Rotation** — every time you refresh, the old refresh token dies and a new pair is created. If someone steals a refresh token and uses it after the real user has already refreshed, the family metadata catches the theft and invalidates everything.
- **Logout** deletes the access token, refresh token, and family key from Redis in one pipeline operation.

---

## Config

These come from `src/config/env.js`, which reads environment variables.

| Variable                    | Default        | What it does                                    |
| --------------------------- | -------------- | ----------------------------------------------- |
| `MONGO_URI`                 | —              | Where the user data lives                       |
| `REDIS_URL`                 | —              | Where tokens and QR sessions live               |
| `JWT_ACCESS_SECRET`         | —              | Signs access tokens                             |
| `JWT_ACCESS_EXPIRES_IN`     | `15m`          | How long access tokens stay valid               |
| `JWT_ISSUER`                | `auth-service` | JWT `iss` claim                                 |
| `JWT_AUDIENCE`              | `app-client`   | JWT `aud` claim                                 |
| `GOOGLE_CLIENT_ID`          | —              | Optional — without it, Google login is disabled |
| `AUTH0_DOMAIN`              | —              | Optional — without it, Auth0 login is disabled  |
| `AUTH0_AUDIENCE`            | —              | Auth0 API audience                              |
| `AUTH_PORT`                 | `5001`         | Port for standalone mode                        |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000`       | Rate limit window (15 min)                      |
| `AUTH_RATE_LIMIT_MAX`       | `20`           | Requests per window                             |
| `QR_TTL_SECONDS`            | `300`          | QR session expiry (5 min)                       |
| `MOBILE_DEEP_LINK_BASE`     | —              | Base URL encoded in the QR                      |

---

## Errors

The module throws exceptions from `src/modules/shared/exceptions/`. A global error handler catches them and returns consistent JSON.

| Exception               | HTTP code | When                                        |
| ----------------------- | --------- | ------------------------------------------- |
| `AppException`          | Varies    | General operational failures                |
| `UnauthorizedException` | 401       | Bad credentials, expired or invalid token   |
| `ForbiddenException`    | 403       | Account not activated, account banned       |
| `NotFoundException`     | 404       | User doesn't exist                          |
| `ConflictException`     | 409       | Duplicate email, account collision          |
| `ValidationException`   | 422       | Request body failed express-validator rules |

Response format:

```json
{
  "success": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

---

## Security odds and ends

- Passwords go through bcrypt with 12 salt rounds
- Refresh tokens are random 64-byte values, hashed with SHA-256 before touching Redis. The raw value is shown exactly once
- Token families catch refresh token theft — reuse a stale token and the whole family gets nuked
- Rate limiting on everything that looks like a login attempt
- IP extraction handles X-Forwarded-For, X-Real-IP, and CF-Connecting-IP
- Google tokens are verified either via google-auth-library or by hitting the userinfo endpoint
- Auth0 tokens are verified against the JWKS endpoint

---

## Running it

### Standalone

```bash
set MONGO_URI=mongodb://localhost:27017/tasteai
set REDIS_URL=redis://localhost:6379
set JWT_ACCESS_SECRET=some-random-secret
node src/modules/auth/standalone.js
```

Starts on port 5001 (or whatever `AUTH_PORT` says). Routes at `/api/auth/user`.

### Inside the main app

```javascript
const { createAuthModule } = require('./modules/auth');
const { router, authMiddleware } = createAuthModule();
app.use('/api/auth/user', router);

// Use auth check in other modules
app.use('/api/recipes', authMiddleware.requireAuth, recipeRoutes);
```

`authMiddleware` gives you:

- `requireAuth` — returns 401 if no valid token
- `optionalAuth` — attaches `req.user` if token is valid, but doesn't block the request if it's missing

One rule: other modules should never query the user database directly. Use the repository or the middleware.

---

## Contributing

### How to think about changes

- **Layer boundaries are real.** Application and domain code should never import from infrastructure. If you need to add a new external dependency, it goes in `infrastructure/`.
- **One class, one job.** Use cases have one `execute()` method. Strategies implement one algorithm. Auth strategies handle one provider.
- **Go through the Facade.** Controllers (and any external consumer) should only talk to `AuthFacade`. Don't import use cases directly in the presentation layer.
- **Use shared exceptions.** Throw `AppException` or one of its subclasses. Don't throw generic `Error` — the error handler won't know what status code to use.

### Adding a new provider strategy

See the **[Auth Strategies](#auth-strategies-per-provider-loginregister)** section above for a detailed step-by-step checklist with every file that needs to change (8 files for an OAuth provider, fewer for a password-based one).

### Adding a new verification method

See the **[Verification Strategies](#verification-strategies-per-method-account-activation)** section above for the process.

### Adding a new injectable strategy

See the **[Injectable Strategies](#injectable-strategies-swappable-algorithms)** section above for the process and interface signatures. In most cases it's just: new file → wire in `index.js`.

### Code conventions

- CommonJS — we use `require` and `module.exports`
- `'use strict'` at the top of every file
- Descriptive names, no abbreviations
- JSDoc on public methods if it helps clarity
- No DDD ceremony — no domain events, no domain exception hierarchies, no abstract interfaces for everything. Auth is not that complicated.
