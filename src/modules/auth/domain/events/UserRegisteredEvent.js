'use strict';

class UserRegisteredEvent {
  constructor(userId) {
    this.userId = userId;
    this.occurredAt = new Date();
  }
}

module.exports = UserRegisteredEvent;
