'use strict';

class UserLoggedInEvent {
  constructor(userId, method) {
    this.userId = userId;
    this.method = method;
    this.occurredAt = new Date();
  }
}

module.exports = UserLoggedInEvent;
