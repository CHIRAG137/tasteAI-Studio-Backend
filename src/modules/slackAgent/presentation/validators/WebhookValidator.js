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
  body('url').notEmpty().isURL().withMessage('Valid webhook URL is required'),
  body('events').isArray({ min: 1 }).withMessage('Events must be a non-empty array'),
  runValidation,
];

exports.updateRules = [
  param('webhookId').notEmpty().withMessage('Webhook id is required'),
  body('url').optional().isURL().withMessage('Valid webhook URL is required'),
  body('events').optional().isArray({ min: 1 }).withMessage('Events must be a non-empty array'),
  runValidation,
];

exports.webhookIdParam = [
  param('webhookId').notEmpty().withMessage('Webhook id is required'),
  runValidation,
];

exports.triggerRules = [
  param('webhookId').notEmpty().withMessage('Webhook id is required'),
  body('payload').optional().isObject().withMessage('Payload must be an object'),
  runValidation,
];
