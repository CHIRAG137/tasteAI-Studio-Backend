'use strict';

const { body, param, check, validationResult } = require('express-validator');
const ApiResponse = require('../../../shared/response/ApiResponse');

/**
 * Middleware that runs express-validator checks and returns a 422 if any fail.
 * @private
 */
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.unprocessableEntity(res, errors.array(), 'Validation failed');
  }
  return next();
};

/**
 * Validation rule sets for each auth endpoint.
 * Each export is an array of express-validator rules + the runValidation finaliser.
 */

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
  runValidation,
];

exports.loginRules = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  runValidation,
];

exports.googleLoginRules = [
  body('token').notEmpty().withMessage('Google token is required'),
  runValidation,
];

exports.auth0LoginRules = [
  body('accessToken').notEmpty().withMessage('Auth0 accessToken is required'),
  runValidation,
];

exports.refreshRules = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
  runValidation,
];

exports.qrVerifyRules = [
  check('sessionId').notEmpty().withMessage('sessionId is required'),
  check('phoneNumber')
    .optional()
    .matches(/^\+[1-9]\d{7,14}$/)
    .withMessage('phoneNumber must be in E.164 format (e.g. +12223334444)'),
  runValidation,
];

exports.qrPollRules = [
  param('sessionId').notEmpty().withMessage('sessionId is required'),
  runValidation,
];
