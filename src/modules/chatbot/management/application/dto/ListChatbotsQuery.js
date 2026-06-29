'use strict';

class ListChatbotsQuery {
  constructor({ userId, page = 1, limit = 10 }) {
    this.userId = userId;
    this.page = Math.max(1, parseInt(page, 10) || 1);
    this.limit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    this.skip = (this.page - 1) * this.limit;
    this.validate();
  }

  validate() {
    if (!this.userId) {
      throw new Error('User id is required');
    }
  }
}

module.exports = ListChatbotsQuery;
