'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class TicketController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  create = async (req, res) => {
    const ticket = await this.slackAgentFacade.createTicketUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      createdById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, ticket, 'Ticket created successfully');
  };

  getById = async (req, res) => {
    const ticket = await this.slackAgentFacade.getTicketUseCase.execute(req.params.ticketId);
    return ApiResponse.success(res, ticket);
  };

  list = async (req, res) => {
    const tickets = await this.slackAgentFacade.listTicketsUseCase.execute(
      req.user.organizationId || req.user.id,
      req.query,
    );
    return ApiResponse.success(res, tickets);
  };

  search = async (req, res) => {
    const tickets = await this.slackAgentFacade.ticketSearchUseCase.execute({
      query: req.query.q,
      organizationId: req.user.organizationId || req.user.id,
      ...req.query,
    });
    return ApiResponse.success(res, tickets);
  };

  update = async (req, res) => {
    const ticket = await this.slackAgentFacade.updateTicketUseCase.execute({
      ticketId: req.params.ticketId,
      ...req.body,
    });
    return ApiResponse.success(res, ticket, 'Ticket updated successfully');
  };

  close = async (req, res) => {
    const ticket = await this.slackAgentFacade.changeTicketStatusUseCase.execute({
      ticketId: req.params.ticketId,
      status: 'closed',
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, ticket, 'Ticket closed');
  };

  reopen = async (req, res) => {
    const ticket = await this.slackAgentFacade.changeTicketStatusUseCase.execute({
      ticketId: req.params.ticketId,
      status: 'reopened',
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, ticket, 'Ticket reopened');
  };

  assign = async (req, res) => {
    const ticket = await this.slackAgentFacade.assignTicketUseCase.execute({
      ticketId: req.params.ticketId,
      assigneeId: req.body.assigneeId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, ticket, 'Ticket assigned');
  };

  unassign = async (req, res) => {
    const ticket = await this.slackAgentFacade.unassignTicketUseCase.execute({
      ticketId: req.params.ticketId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, ticket, 'Ticket unassigned');
  };

  transfer = async (req, res) => {
    const ticket = await this.slackAgentFacade.transferTicketUseCase.execute({
      ticketId: req.params.ticketId,
      fromUserId: req.body.fromUserId,
      toUserId: req.body.toUserId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, ticket, 'Ticket transferred');
  };

  merge = async (req, res) => {
    const result = await this.slackAgentFacade.mergeTicketsUseCase.execute({
      sourceTicketIds: req.body.sourceTicketIds,
      targetTicketId: req.params.ticketId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Tickets merged');
  };

  split = async (req, res) => {
    const result = await this.slackAgentFacade.splitTicketUseCase.execute({
      sourceTicketId: req.params.ticketId,
      newTicketTitles: req.body.titles,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.created(res, result, 'Tickets split');
  };

  addComment = async (req, res) => {
    const comment = await this.slackAgentFacade.addTicketCommentUseCase.execute({
      ticketId: req.params.ticketId,
      authorId: req.user.id,
      authorType: 'user',
      ...req.body,
    });
    return ApiResponse.created(res, comment, 'Comment added');
  };

  addAttachment = async (req, res) => {
    const attachment = await this.slackAgentFacade.addTicketAttachmentUseCase.execute({
      ticketId: req.params.ticketId,
      uploadedById: req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, attachment, 'Attachment added');
  };

  getTimeline = async (req, res) => {
    const timeline = await this.slackAgentFacade.getTicketUseCase.execute(req.params.ticketId);
    return ApiResponse.success(res, timeline?.timeline || []);
  };

  getHistory = async (req, res) => {
    const history = await this.slackAgentFacade.auditLogUseCase.execute({
      resourceType: 'ticket',
      resourceId: req.params.ticketId,
    });
    return ApiResponse.success(res, history);
  };

  watch = async (req, res) => {
    const result = await this.slackAgentFacade.watchTicketUseCase.execute({
      ticketId: req.params.ticketId,
      userId: req.user.id,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Now watching ticket');
  };

  follow = async (req, res) => {
    const result = await this.slackAgentFacade.followTicketUseCase.execute({
      ticketId: req.params.ticketId,
      userId: req.user.id,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result, 'Now following ticket');
  };
}

module.exports = TicketController;
