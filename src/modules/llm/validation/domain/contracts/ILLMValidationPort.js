'use strict';

class ILLMValidationPort {
  async execute() {
    throw new Error(`${this.constructor.name}.execute() not implemented`);
  }
}

module.exports = ILLMValidationPort;
