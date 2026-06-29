'use strict';

class CreateWorkflowUseCase {
  constructor({ workflowRepository }) {
    this.workflowRepository = workflowRepository;
  }

  async execute(command) {
    return this.workflowRepository.save(command);
  }
}

module.exports = CreateWorkflowUseCase;
