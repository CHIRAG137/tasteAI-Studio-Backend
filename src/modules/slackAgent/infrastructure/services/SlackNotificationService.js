'use strict';

class SlackNotificationService {
  constructor({ slackApiClient }) {
    this.slackApiClient = slackApiClient;
  }

  async send(accessToken, channelId, message) {
    return this.slackApiClient.postMessage(accessToken, channelId, message);
  }

  async sendEphemeral(accessToken, channelId, userId, message) {
    return this.slackApiClient.postEphemeral(accessToken, channelId, userId, message);
  }

  async notifyTicketAssignment(accessToken, channelId, ticketTitle, assigneeName) {
    return this.send(accessToken, channelId, {
      text: `*Ticket Assigned*: ${ticketTitle}\nAssigned to: ${assigneeName}`,
    });
  }

  async notifySLAWarning(accessToken, channelId, ticketTitle, deadline) {
    return this.send(accessToken, channelId, {
      text: `*SLA Warning*: ${ticketTitle}\nDeadline: ${deadline.toISOString()}`,
    });
  }

  async notifyEscalation(accessToken, channelId, ticketTitle, level) {
    return this.send(accessToken, channelId, {
      text: `*Escalation Level ${level}*: ${ticketTitle}`,
    });
  }
}

module.exports = SlackNotificationService;
