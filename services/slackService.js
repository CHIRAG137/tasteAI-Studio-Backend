const slackClient = require('../config/slackClient');
const SlackWorkspaceModel = require('../src/modules/slackAgent/infrastructure/persistence/models/SlackWorkspaceModel');
const User = require('../models/User');
const ChatBot = require('../models/ChatBot');
const botController = require('../controllers/botController');
const logger = require('../utils/logger');

// get the oauth url for verification
exports.getSlackOAuthUrl = (userId) => {
  const state = encodeURIComponent(JSON.stringify({ userId }));
  const url = `https://slack.com/oauth/v2/authorize?client_id=${
    process.env.SLACK_CLIENT_ID
  }&scope=chat:write,commands,users:read,channels:read,channels:join,groups:write&user_scope=&redirect_uri=${
    process.env.SLACK_REDIRECT_URI
  }&state=${state}`;

  logger.info('Generated Slack OAuth URL', { userId, url });
  return url;
};

// connect to slack app using slack oauth callback
exports.processSlackOAuthCallback = async (code, state) => {
  let decodedState;
  try {
    decodedState = JSON.parse(decodeURIComponent(state));
    logger.info('Decoded Slack OAuth state', { decodedState });
  } catch (err) {
    logger.error('Invalid Slack OAuth state format', {
      state,
      error: err.message,
    });
    throw new Error('Invalid state format');
  }

  try {
    const response = await slackClient.post('/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: process.env.SLACK_REDIRECT_URI,
      },
    });

    const { access_token, bot_user_id, team, authed_user, scope } = response.data;

    if (!access_token) {
      logger.error('Slack OAuth failed - no access token', {
        response: response.data,
      });
      throw new Error('OAuth failed');
    }

    const user = await User.findById(decodedState.userId);
    if (!user) {
      throw new Error('User not found');
    }

    await SlackWorkspaceModel.findOneAndUpdate(
      { teamId: team.id },
      {
        organizationId: user._id,
        teamId: team.id,
        teamName: team.name,
        accessToken: access_token,
        botUserId: bot_user_id,
        botAccessToken: access_token,
        scopes: scope ? scope.split(',') : [],
        authedUserId: authed_user.id,
        installedById: user._id,
        installedAt: new Date(),
        isActive: true,
      },
      { upsert: true, new: true },
    );

    logger.info('Slack OAuth callback processed successfully', {
      userId: decodedState.userId,
      teamId: team.id,
      teamName: team.name,
    });
  } catch (err) {
    logger.error('Slack OAuth callback processing failed', {
      error: err.message,
      code,
      state,
    });
    throw err;
  }
};

// webhook to listen to message received on the slack channel and responding to the query
exports.handleSlackEvent = async (body) => {
  const { type, challenge, event, team_id } = body;
  logger.info('Received Slack event', { type, team_id });

  if (type === 'url_verification') {
    logger.info('Handling Slack URL verification challenge');
    return { challenge };
  }

  if (event && event.type === 'message' && !event.bot_id) {
    logger.info('Received Slack message event', {
      channel: event.channel,
      text: event.text,
    });

    const bot = await ChatBot.findOne({ slack_channel_id: event.channel });
    if (!bot) {
      logger.warn('No bot found for Slack channel', { channel: event.channel });
      return;
    }

    const workspace = await SlackWorkspaceModel.findOne({
      teamId: team_id,
    });
    if (!workspace) {
      logger.warn('No Slack workspace found for team', { team_id });
      return;
    }

    const fakeReq = {
      body: { question: event.text, botId: bot._id.toString() },
    };
    const fakeRes = {
      json: async (data) => {
        try {
          await slackClient.post(
            '/chat.postMessage',
            {
              channel: event.channel,
              text: data.answer || data.message,
            },
            {
              headers: {
                Authorization: `Bearer ${workspace.accessToken}`,
              },
            },
          );
          logger.info('Posted message to Slack channel', {
            channel: event.channel,
          });
        } catch (err) {
          logger.error('Failed to post message to Slack', {
            channel: event.channel,
            error: err.message,
          });
        }
      },
    };

    await botController.askBot(fakeReq, fakeRes);
    logger.info('Processed Slack message event with botController', {
      botId: bot._id.toString(),
      channel: event.channel,
    });
  }
};
