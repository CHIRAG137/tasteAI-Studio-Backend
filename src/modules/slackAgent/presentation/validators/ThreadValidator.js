'use strict';

const { body, param, validationResult } = require('express-validator');
const ApiResponse = require('../../../shared/response/ApiResponse');

const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.unprocessableEntity(res, errors.array(), 'Validation failed');
  }
  return next();
};

exports.threadIdParam = [
  param('threadId').notEmpty().withMessage('Thread id is required'),
  runValidation,
];

exports.linkToTicketRules = [
  param('threadId').notEmpty().withMessage('Thread id is required'),
  body('ticketId').notEmpty().withMessage('Ticket id is required'),
  runValidation,
];
