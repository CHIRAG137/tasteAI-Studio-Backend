const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
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
const { startInviteReminderScheduler } = require('./services/inviteReminderScheduler');

require('dotenv').config();

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
    ],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start the invite reminder scheduler (runs every hour)
  startInviteReminderScheduler('0 * * * *');
});
