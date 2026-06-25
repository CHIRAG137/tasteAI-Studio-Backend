'use strict';

class HumanHandoffSettings {
  constructor({ enabled = false, agentEmails = [] }) {
    this.enabled = enabled;
    this.agentEmails = agentEmails;

    this.validate();
  }

  validate() {
    if (this.enabled && (!Array.isArray(this.agentEmails) || this.agentEmails.length === 0)) {
      throw new Error('Agent emails required when human handoff enabled');
    }
  }
}

module.exports = HumanHandoffSettings;
