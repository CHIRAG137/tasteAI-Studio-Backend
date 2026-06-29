'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class SlackAIController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  updateCapabilities = async (req, res) => {
    const agent = await this.slackAgentFacade.updateSlackAICapabilitiesUseCase.execute({
      agentId: req.params.agentId,
      slackAiCapabilities: req.body,
      organizationId: req.user.organizationId || req.user.id,
      actorId: req.user.id,
    });
    return ApiResponse.success(res, agent, 'Slack AI capabilities updated');
  };

  getCapabilities = async (req, res) => {
    const connectors = await this.slackAgentFacade.listAgentConnectorsUseCase.execute({
      agentId: req.params.agentId,
    });
    return ApiResponse.success(res, connectors.slackAiCapabilities);
  };

  triggerChannelSummary = async (req, res) => {
    const { agentId } = req.params;
    const { channelId } = req.body;
    const result = await this.slackAgentFacade.triggerChannelSummaryUseCase.execute({
      agentId,
      channelSlackId: channelId,
      organizationId: req.user.organizationId,
    });
    return ApiResponse.success(res, result, 'Channel summary generated');
  };

  listFeatures = async (req, res) => {
    const features = [
      {
        id: 'channelSummary',
        name: 'Channel Summary',
        description: 'AI-powered daily channel summaries',
        enabled: false,
      },
      {
        id: 'threadSummary',
        name: 'Thread Summary',
        description: 'Summarize long threads into key points',
        enabled: false,
      },
      {
        id: 'messageSuggestion',
        name: 'Message Suggestions',
        description: 'Suggest replies based on conversation context',
        enabled: false,
      },
      {
        id: 'smartReply',
        name: 'Smart Reply',
        description: 'One-click smart reply suggestions',
        enabled: false,
      },
      {
        id: 'autoTagging',
        name: 'Auto Tagging',
        description: 'Automatically tag messages by category',
        enabled: false,
      },
      {
        id: 'sentimentAnalysis',
        name: 'Sentiment Analysis',
        description: 'Detect sentiment in messages and flag urgent issues',
        enabled: false,
      },
      {
        id: 'knowledgeRetrieval',
        name: 'Knowledge Retrieval',
        description: 'Search and retrieve from connected knowledge bases',
        enabled: false,
      },
    ];
    return ApiResponse.success(res, features);
  };
}

module.exports = SlackAIController;
