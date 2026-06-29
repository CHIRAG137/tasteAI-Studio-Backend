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

exports.workspaceIdParam = [
  param('workspaceId').notEmpty().withMessage('Workspace id is required'),
  runValidation,
];

exports.channelIdParam = [
  param('channelId').notEmpty().withMessage('Channel id is required'),
  runValidation,
];

exports.searchRules = [
  param('workspaceId').notEmpty().withMessage('Workspace id is required'),
  query('q').notEmpty().withMessage('Search query is required'),
  runValidation,
];

exports.updatePermissionsRules = [
  param('channelId').notEmpty().withMessage('Channel id is required'),
  body('permissions').isArray({ min: 1 }).withMessage('Permissions must be a non-empty array'),
  runValidation,
];

exports.updateConfigRules = [
  param('channelId').notEmpty().withMessage('Channel id is required'),
  body('configuration').isObject().withMessage('Configuration must be an object'),
  runValidation,
];
