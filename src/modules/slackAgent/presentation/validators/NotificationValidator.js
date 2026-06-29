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

exports.sendRules = [
  body('recipientId').notEmpty().withMessage('Recipient id is required'),
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('type')
    .optional()
    .isIn(['info', 'warning', 'error', 'success'])
    .withMessage('Invalid notification type'),
  runValidation,
];

exports.notificationIdParam = [
  param('notificationId').notEmpty().withMessage('Notification id is required'),
  runValidation,
];

exports.markReadRules = [
  param('notificationId').notEmpty().withMessage('Notification id is required'),
  runValidation,
];
