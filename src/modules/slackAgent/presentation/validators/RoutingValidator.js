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

exports.createRuleRules = [
  body('name').notEmpty().trim().withMessage('Rule name is required'),
  body('condition').isObject().withMessage('Condition must be an object'),
  body('target').notEmpty().withMessage('Target is required'),
  runValidation,
];

exports.updateRuleRules = [
  param('ruleId').notEmpty().withMessage('Rule id is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('condition').optional().isObject().withMessage('Condition must be an object'),
  body('target').optional().notEmpty().withMessage('Target cannot be empty'),
  runValidation,
];

exports.ruleIdParam = [
  param('ruleId').notEmpty().withMessage('Rule id is required'),
  runValidation,
];

exports.reorderRules = [
  body('ruleIds').isArray({ min: 1 }).withMessage('ruleIds must be a non-empty array'),
  runValidation,
];
