'use strict';

class ICustomizationProvisioningPort {
  async execute() {
    throw new Error(`${this.constructor.name}.execute() not implemented`);
  }
}

module.exports = ICustomizationProvisioningPort;
