'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

function requireWorkspaceAccess(req, res, next) {
  const { workspaceId } = req.params;
  if (!workspaceId) {
    return ApiResponse.badRequest(res, null, 'Workspace id is required');
  }
  return next();
}

function requireAgentAccess(req, res, next) {
  const { agentId } = req.params;
  if (!agentId) {
    return ApiResponse.badRequest(res, null, 'Agent id is required');
  }
  return next();
}

function requireTicketAccess(req, res, next) {
  const { ticketId } = req.params;
  if (!ticketId) {
    return ApiResponse.badRequest(res, null, 'Ticket id is required');
  }
  return next();
}

function requireAdminRole(req, res, next) {
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, null, 'Admin access required');
  }
  return next();
}

module.exports = {
  requireWorkspaceAccess,
  requireAgentAccess,
  requireTicketAccess,
  requireAdminRole,
};
