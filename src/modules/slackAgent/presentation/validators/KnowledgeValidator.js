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

exports.uploadRules = [
  body('name').notEmpty().trim().withMessage('Knowledge name is required'),
  body('sourceType')
    .isIn(['pdf', 'url', 'notion', 'google_drive', 'confluence', 'manual', 'api'])
    .withMessage('Invalid source type'),
  runValidation,
];

exports.searchRules = [
  query('q').notEmpty().withMessage('Search query is required'),
  runValidation,
];
