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
  body('name').notEmpty().trim().withMessage('Workflow name is required'),
  body('trigger').notEmpty().withMessage('Workflow trigger is required'),
  runValidation,
];

exports.executeRules = [
  param('workflowId').notEmpty().withMessage('Workflow id is required'),
  body('input').optional().isObject().withMessage('Input must be an object'),
  runValidation,
];

exports.approveStepRules = [
  body('executionId').notEmpty().withMessage('Execution id is required'),
  body('stepId').notEmpty().withMessage('Step id is required'),
  body('approvedBy').notEmpty().withMessage('Approved by is required'),
  runValidation,
];
