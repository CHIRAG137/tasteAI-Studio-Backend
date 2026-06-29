'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class NotificationController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  send = async (req, res) => {
    const notification = await this.slackAgentFacade.sendNotificationUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.accepted(res, notification, 'Notification queued');
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  markRead = async (req, res) => {
    return ApiResponse.success(res, {}, 'Notification marked as read');
  };
}

module.exports = NotificationController;
