'use strict';

class RemoveMonitoredChannelUseCase {
  constructor({ channelRepository }) {
    this.channelRepository = channelRepository;
  }

  async execute(command) {
    return this.channelRepository.update(command.channelId, { isMonitored: false });
  }
}

module.exports = RemoveMonitoredChannelUseCase;
