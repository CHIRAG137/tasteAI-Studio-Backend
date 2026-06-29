'use strict';

class ExecuteWorkflowUseCase {
  constructor({ workflowRepository, workflowEngine }) {
    this.workflowRepository = workflowRepository;
    this.workflowEngine = workflowEngine;
  }

  async execute(command) {
    const workflow = await this.workflowRepository.findById(command.workflowId);
    return this.workflowEngine.execute(workflow, command.input, command.triggeredBy);
  }
}

module.exports = ExecuteWorkflowUseCase;
