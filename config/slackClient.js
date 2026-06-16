const axios = require('axios');
const logger = require('../utils/logger');

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_BASE_URL = 'https://slack.com/api';

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET) {
  throw new Error('SLACK_CLIENT_ID or SLACK_CLIENT_SECRET is not defined');
}

const slackClient = axios.create({
  baseURL: SLACK_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

slackClient.interceptors.response.use(
  (response) => {
    if (response.data && !response.data.ok) {
      logger.error('Slack API error', {
        error: response.data.error,
        data: response.data,
      });
      const error = new Error(response.data.error || 'Slack API error');
      error.response = response;
      throw error;
    }
    return response;
  },
  (error) => {
    logger.error('Slack API request error', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  },
);

module.exports = slackClient;
