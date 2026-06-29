'use strict';

class CreateRoutingRuleUseCase {
  constructor({ routingRepository }) {
    this.routingRepository = routingRepository;
  }

  async execute(command) {
    return this.routingRepository.save(command);
  }
}

module.exports = CreateRoutingRuleUseCase;
