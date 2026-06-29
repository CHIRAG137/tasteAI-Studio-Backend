'use strict';

/**
 * Declarative registry of all features that CAN be deployed as
 * independent microservices. Adding a new extractable feature = add
 * one entry here. No other file needs to change (Open/Closed).
 */
const SERVICE_REGISTRY = {
  auth: {
    mountPath: '/api/auth/user',
    createModule: () => require('../../modules/auth').createAuthModule(),
    envModeKey: 'AUTH_MODE',
    envUrlKey: 'AUTH_SERVICE_URL',
  },
  chatbot: {
    mountPath: '/api/chatbot',
    createModule: () => require('../../modules/chatbot').createChatbotModule(),
    envModeKey: 'CHATBOT_MODE',
    envUrlKey: 'CHATBOT_SERVICE_URL',
  },
  slackAgent: {
    mountPath: '/api/slack-agent',
    createModule: () => require('../../modules/slackAgent').createSlackAgentModule(),
    envModeKey: 'SLACK_AGENT_MODE',
    envUrlKey: 'SLACK_AGENT_SERVICE_URL',
  },
};

module.exports = { SERVICE_REGISTRY };
