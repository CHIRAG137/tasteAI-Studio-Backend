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

exports.classifyRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('text').notEmpty().withMessage('Text is required for classification'),
  runValidation,
];

exports.detectIntentRules = [
  body('text').notEmpty().withMessage('Text is required'),
  runValidation,
];
