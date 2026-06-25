'use strict';

const AppException = require('./AppException');

class ForbiddenException extends AppException {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super({ message, code, statusCode: 403 });
  }
}

module.exports = ForbiddenException;
