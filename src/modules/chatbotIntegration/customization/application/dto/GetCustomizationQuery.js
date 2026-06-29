'use strict';

class GetCustomizationQuery {
  constructor({ botId, userId }) {
    this.botId = botId;
    this.userId = userId;
    this.validate();
  }

  validate() {
    if (!this.botId) {
      throw new Error('Bot id is required');
    }
  }
}

module.exports = GetCustomizationQuery;
