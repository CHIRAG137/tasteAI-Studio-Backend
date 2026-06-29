'use strict';

class SendNotificationUseCase {
  constructor({ notificationService }) {
    this.notificationService = notificationService;
  }

  async execute(command) {
    return this.notificationService.send(command.recipient, command.template, command.data);
  }
}

module.exports = SendNotificationUseCase;
