const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();

// Fail fast on startup if required env vars are missing
const { validateEnv } = require('./src/config/env');

validateEnv();
const { initPhoenixTracing, shutdownPhoenixTracing } = require('./config/phoenixTracing');

initPhoenixTracing();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const botRoutes = require('./routes/botRoutes');
const crawlRoutes = require('./routes/crawlRoutes');
const slackRoutes = require('./routes/slackRoutes');
const authRoutes = require('./routes/authRoutes');
const flowRoutes = require('./routes/flowRoutes');
const summarizeRoutes = require('./routes/summarizeRoutes');
const elevenlabsRoutes = require('./routes/elevenlabsRoutes');
const imageGenerationRoutes = require('./routes/imageGenerationRoutes');
const humanAgentRoutes = require('./routes/humanAgentRoutes');
const handoffRoutes = require('./routes/handoffRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const issueReportRoutes = require('./routes/issueReportRoutes');
const visitorAuthRoutes = require('./routes/visitorAuthRoutes');
const userRoutes = require('./routes/userRoutes');
const { startInviteReminderScheduler } = require('./services/inviteReminderScheduler');
const { startBotAutopilotScheduler } = require('./services/botAutopilotScheduler');
const { startBotMonitoringScheduler } = require('./services/botMonitoringScheduler');

const app = express();

app.use(
  cors({
    origin: ['http://localhost:8080', 'https://tastebot-studio.onrender.com'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Visitor-Auth0-Sub',
      'X-Visitor-Email',
      'X-Visitor-Verification-Token',
      'X-Visitor-Device-Id',
    ],
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000), // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 10 auth requests per windowMs

  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/', authLimiter);

// Stricter rate limiting for chatbot interactions to prevent abuse
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 chatbot questions per windowMs
  message: {
    error: 'Too many chatbot requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply strict rate limiting to chatbot ask endpoint
app.use('/api/bots/ask', chatbotLimiter);

// Stricter rate limiting for embed chatbot (flow) interactions
const embedChatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 flow interactions per windowMs
  message: {
    error: 'Too many embed chatbot requests from this IP, please try again later.',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply strict rate limiting to flow (embed chatbot) endpoints
app.use('/api/flow/', embedChatbotLimiter);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

app.use('/api/bots', botRoutes);
app.use('/api/scrape', crawlRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/flow', flowRoutes);
app.use('/api/summarize', summarizeRoutes);
app.use('/api/elevenlabs', elevenlabsRoutes);
app.use('/api/human', imageGenerationRoutes);
app.use('/api/human-agent', humanAgentRoutes);
app.use('/api/handoff', handoffRoutes);
app.use('/api/issue-reports', issueReportRoutes);
app.use('/api/visitor-auth', visitorAuthRoutes);
app.use('/api/user', userRoutes);
// New Clean-Architecture auth module (mobile QR + JWT flows)
const { SERVICE_REGISTRY } = require('./src/config/serviceIntegration/serviceRegistry');
const {
  createServiceIntegrationStrategy,
} = require('./src/config/serviceIntegration/ServiceIntegrationFactory');

Object.entries(SERVICE_REGISTRY).forEach(([key, config]) => {
  const strategy = createServiceIntegrationStrategy(key);
  strategy.mount(app, config.mountPath);
});
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/widget.js'));
});

// keep-alive endpoint
app.get('/api/keep-alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// Global error handler — MUST be registered after all routes
const globalErrorHandler = require('./src/modules/shared/middleware/errorHandler');

app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start the invite reminder scheduler (runs every hour)
  startInviteReminderScheduler('0 * * * *');
  // Check for due bot autopilot recommendation deliveries every 15 minutes
  startBotAutopilotScheduler('*/15 * * * *');
  // Evaluate production monitoring alert thresholds every 15 minutes
  startBotMonitoringScheduler('*/15 * * * *');
});

process.on('SIGTERM', async () => {
  await shutdownPhoenixTracing();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownPhoenixTracing();
  process.exit(0);
});
