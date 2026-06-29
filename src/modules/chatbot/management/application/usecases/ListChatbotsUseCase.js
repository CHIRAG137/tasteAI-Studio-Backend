'use strict';

class ListChatbotsUseCase {
  constructor({ managementRepository }) {
    this.managementRepository = managementRepository;
  }

  async execute(query) {
    const result = await this.managementRepository.findAll(query.userId, {
      skip: query.skip,
      limit: query.limit,
      page: query.page,
    });

    return result;
  }
}

module.exports = ListChatbotsUseCase;
