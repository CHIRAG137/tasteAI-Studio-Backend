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
  body('name').notEmpty().trim().withMessage('SLA name is required'),
  body('responseTimeMinutes').isInt({ min: 1 }).withMessage('Response time must be a positive integer'),
  body('resolutionTimeMinutes').isInt({ min: 1 }).withMessage('Resolution time must be a positive integer'),
  runValidation,
];
