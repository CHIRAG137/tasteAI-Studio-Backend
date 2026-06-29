'use strict';

class ListChannelsUseCase {
  constructor({ channelRepository }) {
    this.channelRepository = channelRepository;
  }

  async execute(workspaceId) {
    return this.channelRepository.findByWorkspaceId(workspaceId);
  }
}

module.exports = ListChannelsUseCase;
