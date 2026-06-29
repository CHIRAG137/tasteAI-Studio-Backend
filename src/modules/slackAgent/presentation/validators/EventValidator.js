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

exports.emitRules = [
  body('eventType').notEmpty().withMessage('Event type is required'),
  body('payload').optional().isObject().withMessage('Payload must be an object'),
  runValidation,
];

exports.subscribeRules = [
  body('eventType').notEmpty().withMessage('Event type is required'),
  body('handler').notEmpty().withMessage('Handler is required'),
  runValidation,
];

exports.eventIdParam = [
  param('eventId').notEmpty().withMessage('Event id is required'),
  runValidation,
];
