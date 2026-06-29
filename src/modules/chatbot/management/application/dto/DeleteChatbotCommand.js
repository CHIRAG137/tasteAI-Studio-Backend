'use strict';

class DeleteChatbotCommand {
  constructor({ botId, userId }) {
    this.botId = botId;
    this.userId = userId;
    this.validate();
  }

  validate() {
    if (!this.botId) {
      throw new Error('Bot id is required');
    }
    if (!this.userId) {
      throw new Error('User id is required');
    }
  }
}

module.exports = DeleteChatbotCommand;
