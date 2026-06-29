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
  body('name').notEmpty().trim().withMessage('Skill name is required'),
  body('description').optional().trim().withMessage('Description must be a string'),
  runValidation,
];

exports.updateRules = [
  param('skillId').notEmpty().withMessage('Skill id is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim().withMessage('Description must be a string'),
  runValidation,
];

exports.skillIdParam = [
  param('skillId').notEmpty().withMessage('Skill id is required'),
  runValidation,
];

exports.assignToAgentRules = [
  param('skillId').notEmpty().withMessage('Skill id is required'),
  body('agentIds').isArray({ min: 1 }).withMessage('agentIds must be a non-empty array'),
  runValidation,
];
