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

exports.createPolicyRules = [
  body('name').notEmpty().trim().withMessage('Policy name is required'),
  body('conditions').isArray({ min: 1 }).withMessage('Conditions must be a non-empty array'),
  body('targetUserId').notEmpty().withMessage('Target user id is required'),
  runValidation,
];

exports.updatePolicyRules = [
  param('policyId').notEmpty().withMessage('Policy id is required'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('conditions').optional().isArray({ min: 1 }).withMessage('Conditions must be a non-empty array'),
  body('targetUserId').optional().notEmpty().withMessage('Target user id cannot be empty'),
  runValidation,
];

exports.policyIdParam = [
  param('policyId').notEmpty().withMessage('Policy id is required'),
  runValidation,
];

exports.escalateRules = [
  param('ticketId').notEmpty().withMessage('Ticket id is required'),
  body('reason').notEmpty().trim().withMessage('Escalation reason is required'),
  runValidation,
];
