'use strict';

const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('../../../shared/response/ApiResponse');

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.unprocessableEntity(res, errors.array(), 'Validation failed');
  }
  return next();
};

exports.createRules = [
  body('title').notEmpty().trim().withMessage('Ticket title is required'),
  body('priority').optional().isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid priority'),
  body('source').optional().isIn(['slack', 'api', 'email', 'web', 'portal', 'ai']).withMessage('Invalid source'),
  runValidation,
];

exports.ticketIdParam = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  runValidation,
];

exports.updateRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('priority').optional().isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid priority'),
  body('status').optional().isIn(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed', 'reopened']).withMessage('Invalid status'),
  runValidation,
];

exports.assignRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('assigneeId').notEmpty().withMessage('Assignee id is required'),
  runValidation,
];

exports.transferRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('fromUserId').notEmpty().withMessage('From user id is required'),
  body('toUserId').notEmpty().withMessage('To user id is required'),
  runValidation,
];

exports.mergeRules = [
  param('ticketId').notEmpty().withMessage('Target ticket id is required'),
  body('sourceTicketIds').isArray({ min: 1 }).withMessage('sourceTicketIds must be a non-empty array'),
  runValidation,
];

exports.splitRules = [
  param('ticketId').notEmpty().withMessage('Source ticket id is required'),
  body('titles').isArray({ min: 1 }).withMessage('titles must be a non-empty array'),
  runValidation,
];

exports.commentRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('body').notEmpty().trim().withMessage('Comment body is required'),
  runValidation,
];

exports.attachmentRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('fileName').notEmpty().withMessage('File name is required'),
  body('fileUrl').notEmpty().withMessage('File URL is required'),
  runValidation,
];

exports.changeStatusRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('status').isIn(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed', 'reopened']).withMessage('Invalid status'),
  runValidation,
];
