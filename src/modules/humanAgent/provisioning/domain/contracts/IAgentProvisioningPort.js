'use strict';

class IAgentProvisioningPort {
  async execute() {
    throw new Error(`${this.constructor.name}.execute() not implemented`);
  }
}

module.exports = IAgentProvisioningPort;
