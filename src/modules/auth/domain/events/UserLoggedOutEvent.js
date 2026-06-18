'use strict';

class UserLoggedOutEvent {
  constructor(userId) {
    this.userId = userId;
    this.occurredAt = new Date();
  }
}

module.exports = UserLoggedOutEvent;
