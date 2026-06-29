'use strict';

const IBotQuery = require('../../domain/ports/IBotQuery');

class BotQueryAdapter extends IBotQuery {
  constructor({ chatBotModel }) {
    super();
    this.chatBotModel = chatBotModel;
  }

  async findById(id) {
    return this.chatBotModel.findById(id).lean();
  }
}

module.exports = BotQueryAdapter;
