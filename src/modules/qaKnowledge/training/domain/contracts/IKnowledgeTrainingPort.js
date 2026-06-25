'use strict';

class IKnowledgeTrainingPort {
  async execute() {
    throw new Error(`${this.constructor.name}.execute() not implemented`);
  }
}

module.exports = IKnowledgeTrainingPort;
