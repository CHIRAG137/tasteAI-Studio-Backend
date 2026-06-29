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

exports.searchRules = [
  query('q').notEmpty().withMessage('Search query is required'),
  query('type').optional().isIn(['ticket', 'agent', 'channel', 'knowledge', 'workflow', 'thread']).withMessage('Invalid search type'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  runValidation,
];
