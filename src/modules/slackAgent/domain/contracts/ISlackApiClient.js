'use strict';

class ISlackApiClient {
  async getWorkspaceInfo(accessToken) { throw new Error('Not implemented'); }
  async listChannels(accessToken, cursor) { throw new Error('Not implemented'); }
  async getChannelInfo(accessToken, channelId) { throw new Error('Not implemented'); }
  async joinChannel(accessToken, channelId) { throw new Error('Not implemented'); }
  async leaveChannel(accessToken, channelId) { throw new Error('Not implemented'); }
  async listUsers(accessToken, cursor) { throw new Error('Not implemented'); }
  async getUserInfo(accessToken, userId) { throw new Error('Not implemented'); }
  async getUserByEmail(accessToken, email) { throw new Error('Not implemented'); }
  async listUserGroups(accessToken) { throw new Error('Not implemented'); }
  async postMessage(accessToken, channelId, message) { throw new Error('Not implemented'); }
  async postEphemeral(accessToken, channelId, userId, message) { throw new Error('Not implemented'); }
  async getThreadReplies(accessToken, channelId, threadTs) { throw new Error('Not implemented'); }
  async addReaction(accessToken, channelId, timestamp, reaction) { throw new Error('Not implemented'); }
  async openConversation(accessToken, userIds) { throw new Error('Not implemented'); }
  async getConversationHistory(accessToken, channelId, cursor) { throw new Error('Not implemented'); }
}

module.exports = ISlackApiClient;
