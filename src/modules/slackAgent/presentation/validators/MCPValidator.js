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

exports.createRules = [
  body('name').notEmpty().trim().withMessage('MCP name is required'),
  body('endpoint').notEmpty().withMessage('Endpoint URL is required'),
  runValidation,
];

exports.updateRules = [
  param('mcpId').notEmpty().withMessage('MCP id is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('endpoint').optional().notEmpty().withMessage('Endpoint cannot be empty'),
  runValidation,
];

exports.mcpIdParam = [
  param('mcpId').notEmpty().withMessage('MCP id is required'),
  runValidation,
];

exports.invokeRules = [
  param('mcpId').notEmpty().withMessage('MCP id is required'),
  body('action').notEmpty().withMessage('Action is required'),
  body('payload').optional().isObject().withMessage('Payload must be an object'),
  runValidation,
];
