'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class AgentInvocationController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  getConfig = async (req, res) => {
    const config = await this.slackAgentFacade.getAgentInvocationConfigUseCase.execute({
      agentId: req.params.agentId,
    });
    return ApiResponse.success(res, config);
  };

  updateConfig = async (req, res) => {
    const agent = await this.slackAgentFacade.updateAgentInvocationConfigUseCase.execute({
      agentId: req.params.agentId,
      invocationConfig: req.body,
      organizationId: req.user.organizationId || req.user.id,
      actorId: req.user.id,
    });
    return ApiResponse.success(res, agent, 'Invocation configuration updated');
  };

  listDefaultModes = async (req, res) => {
    const modes = await this.slackAgentFacade.getDefaultInvocationModesUseCase.execute();
    return ApiResponse.success(res, modes);
  };

  simulateEvent = async (req, res) => {
    const result = await this.slackAgentFacade.simulateAgentInvocationUseCase.execute({
      agentId: req.params.agentId,
      eventType: req.body.eventType,
      messageText: req.body.messageText,
    });
    return ApiResponse.success(res, result);
  };
}

module.exports = AgentInvocationController;
