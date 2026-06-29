'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class ChannelController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  list = async (req, res) => {
    const channels = await this.slackAgentFacade.listChannelsUseCase.execute(
      req.params.workspaceId,
    );
    return ApiResponse.success(res, channels);
  };

  sync = async (req, res) => {
    const channels = await this.slackAgentFacade.syncChannelsUseCase.execute({
      workspaceId: req.params.workspaceId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channels, 'Channels synced successfully');
  };

  search = async (req, res) => {
    const channels = await this.slackAgentFacade.searchChannelsUseCase.execute({
      query: req.query.q,
      workspaceId: req.params.workspaceId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channels);
  };

  getById = async (req, res) => {
    const channel = await this.slackAgentFacade.getChannelDetailsUseCase.execute(
      req.params.channelId,
    );
    return ApiResponse.success(res, channel);
  };

  addMonitored = async (req, res) => {
    const channel = await this.slackAgentFacade.addMonitoredChannelUseCase.execute({
      channelId: req.params.channelId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channel, 'Channel added to monitoring');
  };

  removeMonitored = async (req, res) => {
    const channel = await this.slackAgentFacade.removeMonitoredChannelUseCase.execute({
      channelId: req.params.channelId,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channel, 'Channel removed from monitoring');
  };

  updatePermissions = async (req, res) => {
    const channel = await this.slackAgentFacade.updateChannelPermissionsUseCase.execute({
      channelId: req.params.channelId,
      permissions: req.body.permissions,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channel, 'Channel permissions updated');
  };

  updateConfig = async (req, res) => {
    const channel = await this.slackAgentFacade.updateChannelConfigUseCase.execute({
      channelId: req.params.channelId,
      configuration: req.body.configuration,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, channel, 'Channel configuration updated');
  };
}

module.exports = ChannelController;
