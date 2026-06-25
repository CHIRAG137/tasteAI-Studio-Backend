'use strict';

class IEncryptionService {
  encrypt(_plaintext) {
    throw new Error(`${this.constructor.name}.encrypt() not implemented`);
  }
}

module.exports = IEncryptionService;
