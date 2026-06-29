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

exports.installRules = [
  body('code').notEmpty().withMessage('OAuth code is required'),
  body('redirectUri').notEmpty().withMessage('Redirect URI is required'),
  runValidation,
];

exports.updateSettingsRules = [
  param('workspaceId').notEmpty().withMessage('Workspace id is required'),
  body('settings').isObject().withMessage('Settings must be an object'),
  runValidation,
];

exports.workspaceIdParam = [
  param('workspaceId').notEmpty().withMessage('Workspace id is required'),
  runValidation,
];

exports.disconnectRules = [
  param('workspaceId').notEmpty().withMessage('Workspace id is required'),
  runValidation,
];
