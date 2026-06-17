'use strict';

const { body, param, validationResult } = require('express-validator');
const responseBuilder = require('../../utils/responseBuilder');

/**
 * Middleware that reads express-validator errors and short-circuits with 422.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return responseBuilder.unprocessableEntity(res, errors.array(), 'Validation failed');
  }

  return next();
};

exports.registerRules = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1–100 characters'),

  validate,
];

exports.loginRules = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),

  validate,
];

exports.googleLoginRules = [
  body('token').notEmpty().withMessage('Google token is required'),

  validate,
];

exports.auth0LoginRules = [
  body('accessToken').notEmpty().withMessage('Auth0 accessToken is required'),

  validate,
];

exports.refreshRules = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),

  validate,
];

exports.qrVerifyRules = [
  body('sessionId').notEmpty().withMessage('sessionId is required'),

  body('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage('phoneNumber must be in E.164 format (+12223334444)'),

  validate,
];

exports.qrPollRules = [
  param('sessionId').notEmpty().withMessage('sessionId is required'),

  validate,
];
