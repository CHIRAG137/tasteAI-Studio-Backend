'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createAuthModule } = require('./index');
const { validateEnv, env } = require('../../config/env');

validateEnv();

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: env.AUTH_CORS_ORIGINS, credentials: true }));

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('[auth-service] MongoDB connected'))
  .catch((err) => console.error('[auth-service] MongoDB error:', err));

const { router } = createAuthModule();
app.use('/api/auth/user', router);

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.AUTH_PORT || 5001;
app.listen(PORT, () => console.log(`[auth-service] running standalone on port ${PORT}`));
