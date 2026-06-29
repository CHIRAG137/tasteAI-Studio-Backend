'use strict';

class SimulateAgentInvocationUseCase {
  constructor({ agentRepository }) {
    this.agentRepository = agentRepository;
  }

  async execute(command) {
    const { agentId, eventType, messageText } = command;
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) throw new Error('Agent not found');

    const config = agent.invocationConfig || {};
    const results = [];
    const currentChannelIds = agent.assignedChannelIds?.map(id => id.toString()) || [];

    if (eventType === 'app_mention') {
      results.push({
        method: 'app_mention',
        willRespond: !!config.appMention?.enabled,
        detail: config.appMention?.enabled
          ? `Agent will respond in ${config.appMention.responseInThread !== false ? 'thread' : 'channel'}`
          : 'App mention is disabled',
      });
    }

    if (eventType === 'direct_message') {
      results.push({
        method: 'direct_message',
        willRespond: !!config.directMessage?.enabled,
        detail: config.directMessage?.enabled
          ? `Auto-respond is ${config.directMessage.autoRespond !== false ? 'on' : 'off'}`
          : 'Direct messages are disabled',
      });
    }

    if (eventType === 'message' && messageText) {
      const triggers = config.keywordTriggers || [];
      const triggeredKeyword = triggers.find(
        t => t.enabled && messageText.toLowerCase().includes(t.keyword?.toLowerCase()),
      );

      results.push({
        method: 'keyword_trigger',
        willRespond: !!triggeredKeyword,
        detail: triggeredKeyword
          ? `Matched keyword: "${triggeredKeyword.keyword}"`
          : 'No keyword triggers matched',
      });

      const routingMode = config.routing?.mode || 'all';
      results.push({
        method: 'channel_monitoring',
        willRespond: routingMode !== 'disabled' && currentChannelIds.length > 0,
        detail: `Routing mode: ${routingMode}, ${currentChannelIds.length} channels assigned`,
      });
    }

    if (eventType === 'reaction_added' || eventType === 'file_shared' || eventType === 'member_joined_channel') {
      const webhookEvents = config.webhookEvents || {};
      const eventMap = {
        reaction_added: 'reactionAdded',
        file_shared: 'fileShared',
        member_joined_channel: 'memberJoined',
      };
      const isEnabled = webhookEvents[eventMap[eventType]];
      results.push({
        method: 'webhook_event',
        willRespond: !!isEnabled,
        detail: isEnabled ? 'Webhook event processing is enabled' : 'This event type is disabled',
      });
    }

    return {
      agentId,
      agentName: agent.name,
      eventType,
      messageText: messageText || null,
      results,
      overall: results.some(r => r.willRespond) ? 'will_respond' : 'will_not_respond',
    };
  }
}

module.exports = SimulateAgentInvocationUseCase;
