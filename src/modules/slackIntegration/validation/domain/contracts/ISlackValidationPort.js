'use strict';

class ISlackValidationPort {
  async execute() {
    throw new Error(`${this.constructor.name}.execute() not implemented`);
  }
}

module.exports = ISlackValidationPort;
