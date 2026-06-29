'use strict';

class GetChannelDetailsUseCase {
  constructor({ channelRepository }) {
    this.channelRepository = channelRepository;
  }

  async execute(channelId) {
    return this.channelRepository.findById(channelId);
  }
}

module.exports = GetChannelDetailsUseCase;
