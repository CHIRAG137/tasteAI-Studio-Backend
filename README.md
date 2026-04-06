# TasteAI Studio Backend

Express + MongoDB backend for TasteAI Studio.  
Provides bot management, flow orchestration, public chat APIs, human handoff, analytics support, and Auth0-secured identity layers (visitor, bot owner, and agent).

## Tech Stack

- Node.js + Express 5
- MongoDB + Mongoose
- JWT + Auth0 (JWKS token verification)
- OpenAI / Gemini / Hugging Face integrations
- Slack, Email (SMTP), Cloudinary, ElevenLabs, LiveKit

## Core Capabilities

- Bot CRUD and training ingestion
- Flow engine sessions (`/api/flow/*`)
- Public QA endpoint (`/api/bots/ask`)
- Human handoff queue + agent messaging
- Agent portal APIs (`/api/human-agent/*`)
- Auth0 Token Vault exchange endpoint
- Security controls:
  - Auth0 visitor-token enforcement on selected public APIs
  - Session identity binding
  - Auth0 `sub`-keyed rate limiting

## Why Auth0 Boosts the Platform

- **Security depth**: API access is verified using signed RS256 JWTs from Auth0 (JWKS validation), not only local tokens.
- **Fine-grained identity context**: requests carry stable identity (`sub`) so actions can be audited and rate-limited per user.
- **Safer public endpoints**: flow/ask/handoff can require valid visitor access tokens instead of relying on anonymous traffic.
- **Reduced account risk**: supports social/passwordless/enterprise login with less custom auth logic in app code.
- **Secure delegated access**: Token Vault enables calling external APIs on behalf of users without exposing provider tokens.
- **Future-ready compliance**: easier to add MFA/step-up, org-based auth, and centralized governance later.

## Where Auth0 Is Used in Backend

- **User login bridge**: `/api/auth/auth0-login` exchanges Auth0 access token for app session JWT.
- **Agent login bridge**: `/api/human-agent/auth0-login` links/logs in invited agents via Auth0.
- **Token Vault exchange**: `/api/auth/token-vault/exchange` performs token exchange for connected accounts.
- **Public bot security layer** (when enabled per bot):
  - `/api/flow/start/:botId`
  - `/api/flow/session/:sessionId/respond`
  - `/api/flow/session/:sessionId/system-message`
  - `/api/bots/ask`
  - client handoff endpoints (`request`, `client-message`, `client-messages`, `client-resolve`, `client-reopen`, `rate`, `rating`)
- **Public read protection** (when enabled per bot):
  - `GET /api/bots/:botId`
  - `GET /api/bots/customisation/:botId`
- **Rate limiting by Auth0 subject**: flow/ask/handoff limits keyed by `route + sub`.
- **Session binding**: visitor `sub` must match the stored session identity for protected sessions.
- **Agent API protection**: `authenticateHumanAgent` accepts internal JWT or Auth0 access token linked to `HumanAgent.auth0Id`.

## API Surface

- `/api/auth` - user auth, Auth0 login, Token Vault exchange
- `/api/bots` - bot CRUD, ask, customization, history
- `/api/flow` - flow session start/respond/system events
- `/api/handoff` - handoff request + client/agent interactions
- `/api/human-agent` - agent login/profile/stats/status
- `/api/slack`, `/api/scrape`, `/api/elevenlabs`, `/api/summarize`, `/api/human`

## Project Structure

```text
controllers/     # HTTP handlers
routes/          # API route definitions
services/        # business logic
models/          # mongoose schemas
middlewares/     # auth/ip extraction/guards
utils/           # helpers, auth verification, rate limiting
scripts/         # cron/task scripts
public/          # widget assets
```

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- MongoDB (Atlas/local)

## Environment Variables

Create `.env` in `qloo-hackathon-backend/`.

```bash
# Core
PORT=5000
MONGO_URI=
JWT_SECRET=
FRONTEND_URL=http://localhost:8080

# Auth0 (required for Auth0 login + token enforcement + Token Vault)
AUTH0_DOMAIN=
AUTH0_AUDIENCE=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_M2M_CLIENT_ID=
AUTH0_M2M_CLIENT_SECRET=

# OAuth / Integrations
GOOGLE_CLIENT_ID=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

# AI Providers
OPENAI_API_KEY=
GEMINI_API_KEY=
HF_TOKEN=
FIRECRAWL_API_KEY=

# Media / Voice / Realtime
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=
DID_API_KEY=
DID_API_SECRET=
TAVUS_API_KEY=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=
```

> Do not commit real API keys or secrets.

## Local Setup

```bash
# 1) install dependencies
npm install

# 2) start server
npm start
```

Server runs at `http://localhost:5000`.

## Scripts

- `npm start` - run server
- `npm run lint` - lint all files
- `npm run lint:fix` - auto-fix lint issues
- `npm run format` - prettier format

## Auth0 Setup Notes

## Auth0 Setup (Backend + Platform) - Step by Step

1. In Auth0, create an **API** and set its identifier as `AUTH0_AUDIENCE` (example: `https://my-api`).
2. In Auth0, create/configure applications:
   - **SPA app** for frontend login flows.
   - **M2M app** for Token Vault token exchange (recommended).
3. Set backend env values:
   - `AUTH0_DOMAIN`
   - `AUTH0_AUDIENCE`
   - `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` (fallback confidential flow)
   - `AUTH0_M2M_CLIENT_ID` / `AUTH0_M2M_CLIENT_SECRET` (recommended for Token Vault)
4. Configure grants/permissions:
   - Ensure token exchange is enabled for the app used by Token Vault flow.
   - Ensure frontend requests access tokens for the API audience.
5. Configure frontend Auth0 callbacks/logouts/web origins (see frontend README).
6. Validate end-to-end:
   - `/api/auth/auth0-login` works from dashboard login callback.
   - `/api/human-agent/auth0-login` works from agent callback.
   - visitor-protected bots reject missing/invalid Auth0 bearer token on public endpoints.
   - Token Vault exchange succeeds for connected accounts.

## Security Notes

- Public bot APIs can enforce:
  - `Authorization: Bearer <Auth0 access token>`
  - visitor-session identity matching (`sub` binding)
  - Auth0 `sub`-keyed rate limits
- Agent APIs accept internal agent JWT and Auth0 access token (linked to `HumanAgent.auth0Id`).

## Deployment Checklist

- Set all required env vars in production.
- Restrict CORS origins to trusted frontend domains.
- Use strong random `JWT_SECRET`.
- Rotate API keys regularly.
- Move in-memory rate limiter to Redis if running multiple instances.

## Troubleshooting

- **401 invalid Auth0 token**: verify `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`.
- **Token Vault exchange fails**: check M2M/client credentials + grants.
- **CORS blocked**: update backend CORS `origin` and allowed headers.
- **Mongo connection errors**: confirm `MONGO_URI` and IP/network access.

