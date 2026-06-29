'use strict';

class GetChatbotQuery {
  constructor({ botId }) {
    this.botId = botId;
    this.validate();
  }

  validate() {
    if (!this.botId) {
      throw new Error('Bot id is required');
    }
  }
}

module.exports = GetChatbotQuery;
