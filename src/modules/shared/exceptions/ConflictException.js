'use strict';

const AppException = require('./AppException');

class ConflictException extends AppException {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super({ message, code, statusCode: 409 });
  }
}

module.exports = ConflictException;
