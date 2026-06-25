'use strict';

class SlackIntegrationRepository {
  constructor({ SlackIntegrationModel }) {
    this.SlackIntegrationModel = SlackIntegrationModel;
  }

  async findByUserId(userId) {
    return this.SlackIntegrationModel.findOne({
      userId,
    });
  }

  async findByTeamId(teamId) {
    return this.SlackIntegrationModel.findOne({
      slackTeamId: teamId,
    });
  }

  async create(payload) {
    return this.SlackIntegrationModel.create(payload);
  }

  async update(id, payload) {
    return this.SlackIntegrationModel.findByIdAndUpdate(id, payload, {
      new: true,
    });
  }
}

module.exports = SlackIntegrationRepository;
