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

exports.updateSystemConfigRules = [
  body('config').isObject().withMessage('Config must be an object'),
  runValidation,
];

exports.userIdParam = [
  param('userId').notEmpty().withMessage('User id is required'),
  runValidation,
];

exports.suspendUserRules = [
  param('userId').notEmpty().withMessage('User id is required'),
  body('reason').optional().trim().notEmpty().withMessage('Reason cannot be empty'),
  runValidation,
];

exports.activateUserRules = [
  param('userId').notEmpty().withMessage('User id is required'),
  runValidation,
];
