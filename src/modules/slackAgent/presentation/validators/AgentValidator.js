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
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Agent name is required (1-100 chars)'),
  runValidation,
];

exports.updateRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 chars'),
  runValidation,
];

exports.agentIdParam = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  runValidation,
];

exports.cloneRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('name').notEmpty().trim().withMessage('Cloned agent name is required'),
  runValidation,
];

exports.toggleRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('isEnabled').isBoolean().withMessage('isEnabled must be a boolean'),
  runValidation,
];

exports.assignChannelsRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('channelIds').isArray({ min: 1 }).withMessage('channelIds must be a non-empty array'),
  runValidation,
];

exports.updateSkillsRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('skills').isArray().withMessage('skills must be an array'),
  runValidation,
];

exports.updatePermissionsRules = [
  param('agentId').notEmpty().withMessage('Agent id is required'),
  body('permissions').isObject().withMessage('permissions must be an object'),
  runValidation,
];
