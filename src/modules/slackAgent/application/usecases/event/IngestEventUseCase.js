'use strict';

const LLMResponseService = require('../../../infrastructure/services/LLMResponseService');

class IngestEventUseCase {
  constructor({
    eventRepository,
    slackEventHandlerService,
    slackApiClient,
    workspaceRepository,
    agentRepository,
    channelRepository,
    slackAiService,
  }) {
    this.eventRepository = eventRepository;
    this.slackEventHandlerService = slackEventHandlerService;
    this.slackApiClient = slackApiClient;
    this.workspaceRepository = workspaceRepository;
    this.agentRepository = agentRepository;
    this.channelRepository = channelRepository;
    this.llmResponseService = new LLMResponseService();
    this.slackAiService = slackAiService;
  }

  async execute(command) {
    const { rawBody, organizationId } = command;

    if (rawBody.type === 'url_verification') {
      return { challenge: rawBody.challenge };
    }

    if (rawBody.type !== 'event_callback' || !rawBody.event) {
      return { ignored: true, reason: 'Not an event_callback' };
    }

    const slackEvent = rawBody.event;
    const eventType = slackEvent.type;
    const teamId = rawBody.team_id;
    const slackWorkspaceId = rawBody.workspace_id || teamId;

    if (slackEvent.bot_id || slackEvent.subtype === 'bot_message') {
      return { ignored: true, reason: 'Bot message, ignoring to prevent loops' };
    }

    // Resolve MongoDB ObjectIds from Slack native IDs
    const workspace = await this.workspaceRepository.findByTeamId(teamId);
    const workspaceMongoId = workspace?._id || workspace?.id;
    let channelMongoId = null;
    if (workspaceMongoId && slackEvent.channel) {
      const channel = await this.channelRepository.findByChannelId(
        workspaceMongoId,
        slackEvent.channel,
      );
      channelMongoId = channel?._id || channel?.id;
    }

    const savedEvent = await this.eventRepository.save({
      eventId: rawBody.event_id || `${eventType}_${Date.now()}`,
      eventType,
      eventTs: slackEvent.event_ts || slackEvent.ts,
      channelId: channelMongoId || slackEvent.channel,
      teamId,
      rawBody,
      source: 'slack',
      organizationId,
      workspaceId: workspaceMongoId || slackWorkspaceId,
      status: 'processing',
      processedAt: null,
    });

    const routingResult = await this.slackEventHandlerService.processEvent({
      eventType,
      rawBody,
      workspaceId: slackWorkspaceId,
      organizationId,
    });

    if (routingResult.matched && routingResult.matches?.length > 0) {
      const botToken = workspace?.accessToken || workspace?.botToken;

      if (botToken) {
        const topMatch = routingResult.matches[0];

        // Look up full agent to get LLM config + prompt instructions
        let agent = await this.agentRepository.findById(topMatch.agentId);

        let replyText;
        const userMessage = routingResult.text || '';

        // Apply pre-LLM Slack AI capabilities (knowledge retrieval, sentiment analysis)
        let aiContext = { enhancedSystemPrompt: null, responseMeta: null };
        if (this.slackAiService) {
          aiContext = await this.slackAiService.applyPreResponseCapabilities(
            agent,
            userMessage,
            routingResult,
          );
        }

        if (topMatch.method === 'keyword_trigger' && topMatch.customResponse) {
          replyText = topMatch.customResponse;
        } else if (agent) {
          // Optionally merge AI context into system prompt
          if (aiContext.enhancedSystemPrompt) {
            const originalPrompt = agent.promptConfig?.systemPrompt || '';
            agent = {
              ...agent,
              promptConfig: {
                ...(agent.promptConfig || {}),
                systemPrompt: originalPrompt
                  ? `${originalPrompt}\n\n${aiContext.enhancedSystemPrompt}`
                  : aiContext.enhancedSystemPrompt,
              },
            };
          }

          replyText = await this.llmResponseService.generateResponse(agent, userMessage);
        } else {
          replyText = `Hi! I'm ${topMatch.agentName}. How can I help you?`;
        }

        const messageOpts = { text: replyText };

        // Respond in thread if configured
        if (topMatch.responseInThread || topMatch.respondInThread) {
          messageOpts.thread_ts = routingResult.ts;
        }

        await this.slackApiClient.postMessage(botToken, routingResult.channelId, messageOpts);

        // Apply post-response Slack AI capabilities (auto-tagging, thread summary, smart reply)
        if (this.slackAiService) {
          this.slackAiService
            .applyPostResponseCapabilities(agent, userMessage, replyText, routingResult, botToken)
            .catch((err) => {
              console.warn(`[IngestEvent] Post-response AI capabilities error: ${err.message}`);
            });
        }
      }
    }

    await this.eventRepository.markProcessed(savedEvent._id || savedEvent.id);

    return savedEvent;
  }
}

module.exports = IngestEventUseCase;
