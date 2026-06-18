'use strict';

const AppException = require('./AppException');

class ValidationException extends AppException {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR') {
    super({ message, code, statusCode: 422 });
  }
}

module.exports = ValidationException;
