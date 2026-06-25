'use strict';

const { encryptApiKey } = require('../../../../../../utils/encryptionUtils');

class EncryptionAdapter {
  encrypt(plaintext) {
    return encryptApiKey(plaintext);
  }
}

module.exports = EncryptionAdapter;
