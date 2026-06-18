'use strict';

const AppException = require('./AppException');

class UnauthorizedException extends AppException {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super({ message, code, statusCode: 401 });
  }
}

module.exports = UnauthorizedException;
