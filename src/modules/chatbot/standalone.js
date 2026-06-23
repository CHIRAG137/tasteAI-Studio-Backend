'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { createChatbotModule } = require('./index');
const { validateEnv, env } = require('../../config/env');

validateEnv();

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: env.CHATBOT_CORS_ORIGINS, credentials: true }));
app.use(express.json());

mongoose
  .connect(env.MONGODB_URI)
  .then(() => console.log('[chatbot-service] MongoDB connected'))
  .catch((err) => console.error('[chatbot-service] MongoDB error:', err));

// The entire chatbot module — all sub-features — is mounted here.
// When deployed standalone, this process owns the full /api/chatbot surface.
const { router } = createChatbotModule();
app.use('/api/chatbot', router);

app.get('/healthz', (req, res) => res.status(200).json({ status: 'ok' }));

const PORT = process.env.PORT || env.CHATBOT_PORT || 5002;
app.listen(PORT, () => console.log(`[chatbot-service] running on port ${PORT}`));
