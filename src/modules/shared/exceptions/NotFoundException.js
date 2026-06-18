'use strict';

const AppException = require('./AppException');

class NotFoundException extends AppException {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super({ message, code, statusCode: 404 });
  }
}

module.exports = NotFoundException;
