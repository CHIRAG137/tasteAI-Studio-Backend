'use strict';

class SearchChannelsUseCase {
  constructor({ channelRepository }) {
    this.channelRepository = channelRepository;
  }

  async execute(query) {
    return this.channelRepository.search(query);
  }
}

module.exports = SearchChannelsUseCase;
