'use strict';

class ICustomizationRepository {
  async findByBotId() {
    throw new Error(`${this.constructor.name}.findByBotId() not implemented`);
  }

  async upsert() {
    throw new Error(`${this.constructor.name}.upsert() not implemented`);
  }
}

module.exports = ICustomizationRepository;
