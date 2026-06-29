'use strict';

/**
 * SlackEventHandlerService
 * 
 * Processes incoming Slack events and routes them to the appropriate agent
 * based on the agent's invocation configuration.
 * 
 * Invocation methods supported:
 *  - @mention (app_mention event)
 *  - Direct message (message event in IM channel)
 *  - Slash commands (slash_commands event)
 *  - Channel monitoring (message event in monitored channels)
 *  - Keyword triggers (message body matching configured keywords)
 *  - Webhook events (reaction_added, file_shared, member_joined, etc.)
 */
class SlackEventHandlerService {
  constructor({ slackApiClient, agentRepository, channelRepository, workspaceRepository }) {
    this.slackApiClient = slackApiClient;
    this.agentRepository = agentRepository;
    this.channelRepository = channelRepository;
    this.workspaceRepository = workspaceRepository;
  }

  /**
   * Process an incoming Slack event and route to matching agents
   */
  async processEvent(event) {
    const { eventType, rawBody, workspaceId } = event;
    const payload = rawBody?.event || rawBody;

    if (!payload) return { matched: false, reason: 'No event payload' };

    switch (eventType) {
      case 'app_mention':
        return this._handleAppMention(event, payload);
      case 'message':
        return this._handleMessage(event, payload);
      case 'slash_commands':
        return this._handleSlashCommand(event, payload);
      case 'reaction_added':
      case 'file_shared':
      case 'member_joined_channel':
        return this._handleWebhookEvent(event, payload);
      default:
        return { matched: false, reason: `Unhandled event type: ${eventType}` };
    }
  }

  /**
   * Handle @mention events — route to agents with appMention enabled
   */
  async _handleAppMention(event, payload) {
    const { channel: channelId, user: userId, text, ts } = payload;
    const workspaceId = event.workspaceId;
    const organizationId = event.organizationId;
    const botUserId = payload.bot_id || null;

    const agents = await this.agentRepository.findEnabled(organizationId);
    const matched = [];

    if (!channelId) return { matched: false, reason: 'No channel in payload' };

    for (const agent of agents) {
      const config = agent.invocationConfig || {};
      if (config.appMention?.enabled) {
        matched.push({
          agentId: agent.id,
          agentName: agent.name,
          method: 'app_mention',
          responseInThread: config.appMention.responseInThread !== false,
          score: 1,
        });
      }
    }

    return {
      matched: matched.length > 0,
      matches: matched,
      channelId,
      userId,
      text,
      ts,
      workspaceId,
    };
  }

  /**
   * Handle message events — route to agents based on channel monitoring,
   * keyword triggers, and direct message config
   */
  async _handleMessage(event, payload) {
    const { channel, channel_type, user: userId, text, ts } = payload;
    const isDM = channel_type === 'im' || channel_type === 'mpim';
    const workspaceId = event.workspaceId;
    const organizationId = event.organizationId;

    const agents = await this.agentRepository.findEnabled(organizationId);
    const matched = [];

    for (const agent of agents) {
      const config = agent.invocationConfig || {};
      let score = 0;
      let method = null;
      const details = {};

      // Direct message
      if (isDM && config.directMessage?.enabled) {
        score = 1;
        method = 'direct_message';
        details.autoRespond = config.directMessage.autoRespond !== false;
      }

      // Channel monitoring — check if agent monitors this channel
      if (!isDM && config.channelMonitoring?.enabled && channel) {
        const channelDoc = await this._findChannelBySlackId(workspaceId, channel);
        if (channelDoc) {
          const agentChannelIds = (agent.assignedChannelIds || []).map(id => id.toString());
          if (agentChannelIds.includes(channelDoc.id)) {
            score = Math.max(score, 0.8);
            method = method || 'channel_monitoring';
            details.respondInThread = config.channelMonitoring.respondInThread || false;
          }
        }
      }

      // Keyword triggers
      const triggers = config.keywordTriggers || [];
      if (triggers.length > 0 && text) {
        for (const trigger of triggers) {
          if (!trigger.enabled) continue;
          const keyword = trigger.keyword?.toLowerCase();
          const messageText = text.toLowerCase();

          let triggered = false;
          switch (trigger.matchType) {
            case 'exact':
              triggered = messageText === keyword;
              break;
            case 'regex':
              try {
                triggered = new RegExp(keyword, 'i').test(text);
              } catch { triggered = false; }
              break;
            case 'contains':
            default:
              triggered = keyword && messageText.includes(keyword);
              break;
          }

          if (triggered) {
            score = Math.max(score, 0.9);
            method = 'keyword_trigger';
            details.triggeredKeyword = trigger.keyword;
            details.customResponse = trigger.response;
            break;
          }
        }
      }

      // Routing mode filter
      const routingMode = config.routing?.mode || 'all';
      if (routingMode === 'disabled') continue;
      if (routingMode === 'keyword_only' && method !== 'keyword_trigger') continue;
      if (routingMode === 'ai_filter' && method !== 'keyword_trigger' && method !== 'direct_message') {
        score = Math.max(score, 0.5);
        details.aiFilter = true;
      }

      if (score > 0) {
        matched.push({
          agentId: agent.id,
          agentName: agent.name,
          method,
          score,
          ...details,
        });
      }
    }

    matched.sort((a, b) => b.score - a.score);

    return {
      matched: matched.length > 0,
      matches: matched,
      channelId: channel,
      userId,
      text,
      ts,
      workspaceId,
      isDM,
    };
  }

  /**
   * Handle slash command events
   */
  async _handleSlashCommand(event, payload) {
    const { channel_id: channelId, user_id: userId, text, command, trigger_id: triggerId } = payload;
    const workspaceId = event.workspaceId;
    const organizationId = event.organizationId;

    const agents = await this.agentRepository.findEnabled(organizationId);
    const matched = [];

    for (const agent of agents) {
      const config = agent.invocationConfig || {};
      const slashCommands = config.slashCommands || [];
      const cmdConfig = slashCommands.find(
        sc => sc.enabled && (command === sc.command || command === `/${sc.command}`),
      );

      if (cmdConfig) {
        matched.push({
          agentId: agent.id,
          agentName: agent.name,
          method: 'slash_command',
          command: cmdConfig.command,
          usageHint: cmdConfig.usageHint,
          score: 1,
        });
      }
    }

    return {
      matched: matched.length > 0,
      matches: matched,
      channelId,
      userId,
      text: text || '',
      command,
      triggerId,
      workspaceId,
    };
  }

  /**
   * Handle webhook/event-based triggers
   */
  async _handleWebhookEvent(event, payload) {
    const { eventType } = event;
    const workspaceId = event.workspaceId;
    const organizationId = event.organizationId;

    const agents = await this.agentRepository.findEnabled(organizationId);
    const matched = [];

    for (const agent of agents) {
      const config = agent.invocationConfig || {};
      const webhookEvents = config.webhookEvents || {};

      const eventKey = this._mapEventTypeToKey(eventType);
      if (webhookEvents[eventKey]) {
        matched.push({
          agentId: agent.id,
          agentName: agent.name,
          method: 'webhook_event',
          eventType,
          score: 0.6,
        });
      }
    }

    return {
      matched: matched.length > 0,
      matches: matched,
      ...payload,
      workspaceId,
    };
  }

  async _findChannelBySlackId(workspaceId, slackChannelId) {
    // workspaceId from event payload is a Slack team ID (T12345), not a MongoDB ObjectId.
    // Look up the workspace first to get the MongoDB ID.
    const workspace = await this.workspaceRepository.findByTeamId(workspaceId);
    if (!workspace) return null;
    return this.channelRepository.findByChannelId(workspace.id, slackChannelId);
  }

  _mapEventTypeToKey(eventType) {
    const map = {
      'reaction_added': 'reactionAdded',
      'file_shared': 'fileShared',
      'member_joined_channel': 'memberJoined',
      'message.channels': 'messageReceived',
      'message.groups': 'messageReceived',
      'message.im': 'messageReceived',
    };
    return map[eventType] || eventType;
  }
}

module.exports = SlackEventHandlerService;
