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

We didn't want auth logic scattered across controllers, models, and random utility files. We also didn't want to commit to a full DDD setup with domain events and abstract interfaces everywhere — auth just doesn't have that many business rules. So we landed somewhere in between:

- Clean Architecture's layer separation (so we can swap Mongo for Postgres or Redis for Memcached without touching business logic)
- A handful of well-known patterns that solve concrete problems in this codebase:
  - **Facade** — controllers talk to one object (`AuthFacade`) instead of eight different use cases
  - **Strategy** — password hashing, JWT signing, token storage are all swappable behind the same interface
  - **Provider** — each authentication method (email/password, Google, Auth0) is a pluggable provider registered in a factory
  - **Repository** — the database is behind a plain JS object; use cases call `findByEmail()` and don't care if it's Mongo or something else
  - **Command (DTO)** — data crosses from controllers to use cases in immutable command objects, not raw `req.body`

The result is that you can read a use case from top to bottom and understand exactly what it does without wondering about Express middleware, Mongoose queries, or JWT internals.

---

## Folder layout

```
src/modules/auth/
├── index.js                          # Wires everything together (composition root)
├── standalone.js                     # Standalone Express server, if you want to run it solo
│
├── application/                      # What the app actually does
│   ├── dto/                          # Command objects — immutable, no logic
│   │   ├── LoginCommand.js
│   │   ├── LogoutCommand.js
│   │   ├── RefreshTokenCommand.js
│   │   ├── RegisterCommand.js
│   │   └── VerifyQrCommand.js
│   ├── facades/
│   │   └── AuthFacade.js             # The one thing controllers import
│   ├── mappers/
│   │   └── AuthResponseMapper.js     # Shapes responses consistently
│   ├── queries/
│   │   └── GetCurrentUserQuery.js    # Fetch profile (read-only)
│   └── usecases/                     # One file per operation
│       ├── LoginUserUseCase.js
│       ├── LogoutUserUseCase.js
│       ├── OAuthLoginUseCase.js
│       ├── PollQrStatusUseCase.js
│       ├── RefreshTokenUseCase.js
│       ├── RegisterUserUseCase.js
│       ├── VerifyQrUseCase.js
│       └── handlers/                 # Per-provider post-auth logic
│           ├── Auth0OAuthHandler.js
│           └── GoogleOAuthHandler.js
│
├── domain/
│   └── User.js                       # Just a plain class with fields and toPublicProfile()
│
├── infrastructure/                   # Everything external lives here
│   ├── config/                       # Thin wrappers around SDKs
│   │   ├── Auth0Client.js
│   │   ├── GoogleOAuthClient.js
│   │   └── RedisClient.js
│   ├── mappers/
│   │   └── UserMapper.js             # Converts between Mongo docs and User objects
│   ├── persistence/
│   │   └── UserModel.js              # Mongoose schema + model
│   ├── providers/                    # Auth providers — pluggable by design
│   │   ├── Auth0AuthProvider.js
│   │   ├── AuthProviderFactory.js
│   │   ├── AuthProviderTypes.js
│   │   ├── EmailPasswordAuthProvider.js
│   │   └── GoogleAuthProvider.js
│   ├── qr/                           # QR generation and key schemes
│   │   ├── QrKeyScheme.js
│   │   └── QrUtils.js
│   ├── redis/
│   │   ├── AuthRedisClient.js
│   │   └── AuthRedisKeyScheme.js
│   ├── repositories/
│   │   └── MongoUserRepository.js    # Database access — the only file that touches Mongo
│   └── strategies/                   # Swappable implementations
│       ├── AuthTokenStore.js
│       ├── BcryptPasswordHasher.js
│       ├── InMemoryEventBus.js
│       ├── JwtSigner.js
│       ├── JwtTokenService.js
│       ├── RedisQrService.js
│       └── RedisSessionService.js
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

### GET /qr-status/:sessionId

Poll this from the web client to check if the QR was scanned. Returns:

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

### Sign-up and QR activation

1. User registers → account is created with `isActive: false`
2. Server generates a QR session ID, stores it in Redis, sends back a QR image
3. Web client shows the QR code
4. User opens the tasteAI mobile app and scans it
5. Mobile app calls `POST /verify-qr` with the session ID
6. Account gets activated, phone gets linked, QR session gets deleted
7. Web client sees `"scanned"` from the poll endpoint and lets the user log in

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
- **One class, one job.** Use cases have one `execute()` method. Strategies implement one algorithm. Providers handle one auth method.
- **Go through the Facade.** Controllers (and any external consumer) should only talk to `AuthFacade`. Don't import use cases directly in the presentation layer.
- **Use shared exceptions.** Throw `AppException` or one of its subclasses. Don't throw generic `Error` — the error handler won't know what status code to use.

### Adding a new sign-in method

1. Create a provider in `infrastructure/providers/`. It needs `getType()` and `authenticate(command)`.
2. Add the type string to `AuthProviderTypes.js`.
3. If the post-auth logic is different from the existing ones, add a handler in `application/usecases/handlers/`.
4. Register everything in `index.js`.
5. Add the route and controller method.

### Adding a new strategy

Stick a file in `infrastructure/strategies/`, inject it into whatever needs it, wire it in `index.js`.

### Code conventions

- CommonJS — we use `require` and `module.exports`
- `'use strict'` at the top of every file
- Descriptive names, no abbreviations
- JSDoc on public methods if it helps clarity
- No DDD ceremony — no domain events, no domain exception hierarchies, no abstract interfaces for everything. Auth is not that complicated.
