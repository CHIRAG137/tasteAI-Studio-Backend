'use strict';

const axios = require('axios');

class SlackApiClient {
  constructor() {
    this.baseUrl = 'https://slack.com/api';
  }

  async _request(method, path, accessToken, data = {}) {
    const response = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data,
    });
    if (!response.data.ok) {
      throw new Error(`Slack API error: ${response.data.error}`);
    }
    return response.data;
  }

  async getWorkspaceInfo(accessToken) {
    return this._request('GET', '/team.info', accessToken);
  }

  async listChannels(accessToken, cursor) {
    return this._request('POST', '/conversations.list', accessToken, {
      types: 'public_channel,private_channel',
      limit: 200,
      cursor,
    });
  }

  async getChannelInfo(accessToken, channelId) {
    return this._request('GET', '/conversations.info', accessToken, { channel: channelId });
  }

  async joinChannel(accessToken, channelId) {
    return this._request('POST', '/conversations.join', accessToken, { channel: channelId });
  }

  async leaveChannel(accessToken, channelId) {
    return this._request('POST', '/conversations.leave', accessToken, { channel: channelId });
  }

  async listUsers(accessToken, cursor) {
    return this._request('GET', '/users.list', accessToken, { limit: 200, cursor });
  }

  async getUserInfo(accessToken, userId) {
    return this._request('GET', '/users.info', accessToken, { user: userId });
  }

  async getUserByEmail(accessToken, email) {
    return this._request('GET', '/users.lookupByEmail', accessToken, { email });
  }

  async postMessage(accessToken, channelId, message) {
    return this._request('POST', '/chat.postMessage', accessToken, {
      channel: channelId,
      ...message,
    });
  }

  async postEphemeral(accessToken, channelId, userId, message) {
    return this._request('POST', '/chat.postEphemeral', accessToken, {
      channel: channelId,
      user: userId,
      ...message,
    });
  }

  async getThreadReplies(accessToken, channelId, threadTs) {
    return this._request('GET', '/conversations.replies', accessToken, {
      channel: channelId,
      ts: threadTs,
    });
  }

  async addReaction(accessToken, channelId, timestamp, reaction) {
    return this._request('POST', '/reactions.add', accessToken, {
      channel: channelId,
      timestamp,
      name: reaction,
    });
  }

  async getConversationHistory(accessToken, channelId, cursor) {
    return this._request('GET', '/conversations.history', accessToken, {
      channel: channelId,
      limit: 100,
      cursor,
    });
  }

  async exchangeOAuthCode(code, redirectUri) {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      },
    });
    console.log('Slack OAuth response:', response.data); // Log the entire response for debugging
    if (!response.data.ok) {
      throw new Error(`Slack OAuth error: ${response.data.error}`);
    }
    return response.data;
  }
}

module.exports = SlackApiClient;
