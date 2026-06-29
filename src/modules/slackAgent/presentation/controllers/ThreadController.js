'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class ThreadController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  getByTicket = async (req, res) => {
    const thread = await this.slackAgentFacade.getThreadUseCase.execute(req.params.ticketId);
    return ApiResponse.success(res, thread);
  };

  linkToTicket = async (req, res) => {
    const result = await this.slackAgentFacade.linkThreadToTicketUseCase.execute({
      threadId: req.params.threadId,
      ticketId: req.body.ticketId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Thread linked to ticket');
  };

  fetch = async (req, res) => {
    const messages = await this.slackAgentFacade.syncThreadUseCase.execute({
      threadId: req.params.threadId,
      workspaceId: req.params.workspaceId,
    });
    return ApiResponse.success(res, messages);
  };

  sync = async (req, res) => {
    const thread = await this.slackAgentFacade.syncThreadUseCase.execute({
      threadId: req.params.threadId,
      workspaceId: req.params.workspaceId,
    });
    return ApiResponse.success(res, thread, 'Thread synced');
  };

  summary = async (req, res) => {
    const summary = await this.slackAgentFacade.generateThreadSummaryUseCase.execute({
      threadId: req.params.threadId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, summary);
  };
}

module.exports = ThreadController;
