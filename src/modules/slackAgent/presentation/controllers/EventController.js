'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class EventController {
  constructor({ slackAgentFacade, workspaceRepository }) {
    this.slackAgentFacade = slackAgentFacade;
    this.workspaceRepository = workspaceRepository;
  }

  ingest = async (req, res) => {
    const rawBody = req.body;

    // Handle Slack URL verification challenge
    if (rawBody.type === 'url_verification') {
      return res.json({ challenge: rawBody.challenge });
    }

    // Derive organization from workspace for unauthenticated Slack events
    let organizationId = req.user?.organizationId || req.user?.id;
    if (!organizationId && rawBody.team_id && this.workspaceRepository) {
      const workspace = await this.workspaceRepository.findByTeamId(rawBody.team_id);
      if (workspace) {
        organizationId = workspace.organizationId;
      }
    }

    const result = await this.slackAgentFacade.ingestEventUseCase.execute({
      rawBody,
      source: req.headers['x-slack-source'] || 'slack',
      organizationId,
    });

    // Slack expects 200 OK for event callbacks
    return ApiResponse.success(res, result);
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  replay = async (req, res) => {
    return ApiResponse.accepted(res, {}, 'Event queued for replay');
  };
}

module.exports = EventController;
