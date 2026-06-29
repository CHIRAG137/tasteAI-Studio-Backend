'use strict';

class GetDefaultInvocationModesUseCase {
  async execute() {
    return {
      appMention: {
        id: 'app_mention',
        name: '@Mention',
        description: 'Agent responds when someone @mentions it in a channel',
        icon: 'at-sign',
        enabledDefault: true,
        configurable: true,
      },
      directMessage: {
        id: 'direct_message',
        name: 'Direct Messages',
        description: 'Agent responds when users send it a direct message',
        icon: 'message-square',
        enabledDefault: true,
        configurable: true,
      },
      slashCommands: {
        id: 'slash_commands',
        name: 'Slash Commands',
        description: 'Custom slash commands like /ask or /agent that trigger the agent',
        icon: 'slash',
        enabledDefault: false,
        configurable: true,
      },
      channelMonitoring: {
        id: 'channel_monitoring',
        name: 'Channel Monitoring',
        description: 'Agent listens to monitored channels and responds automatically',
        icon: 'radio',
        enabledDefault: true,
        configurable: true,
      },
      keywordTriggers: {
        id: 'keyword_triggers',
        name: 'Keyword Triggers',
        description: 'Agent responds when specific keywords or phrases are detected',
        icon: 'file-text',
        enabledDefault: false,
        configurable: true,
      },
      webhookEvents: {
        id: 'webhook_events',
        name: 'Webhook Events',
        description: 'Agent processes Slack events (reactions, file shares, joins) via webhooks',
        icon: 'webhook',
        enabledDefault: false,
        configurable: true,
      },
      routing: {
        id: 'routing',
        name: 'Query Routing',
        description: 'Control how queries are routed to this agent — all messages, AI-filtered, keyword-only, or disabled',
        icon: 'git-branch',
        enabledDefault: false,
        configurable: true,
        options: [
          { value: 'all', label: 'All Messages', description: 'Process every message in scope' },
          { value: 'ai_filter', label: 'AI Filter', description: 'Let AI decide which messages to handle' },
          { value: 'keyword_only', label: 'Keyword Only', description: 'Only respond to keyword-triggered messages' },
          { value: 'disabled', label: 'Disabled', description: 'Do not auto-respond to any messages' },
        ],
      },
    };
  }
}

module.exports = GetDefaultInvocationModesUseCase;
