'use strict';

class CreateWorkflowCommand {
  constructor({ organizationId, name, description, trigger, conditions, steps, variables, timeout, maxRetries, isTemplate, createdById }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.trigger = trigger;
    this.conditions = conditions;
    this.steps = steps;
    this.variables = variables;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.isTemplate = isTemplate;
    this.createdById = createdById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Workflow name is required');
    if (!this.trigger) throw new Error('Workflow trigger is required');
  }
}

class ExecuteWorkflowCommand {
  constructor({ workflowId, input, triggeredBy, organizationId }) {
    this.workflowId = workflowId;
    this.input = input;
    this.triggeredBy = triggeredBy;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.workflowId) throw new Error('Workflow id is required');
  }
}

class ApproveWorkflowStepCommand {
  constructor({ executionId, stepId, approvedBy, reason }) {
    this.executionId = executionId;
    this.stepId = stepId;
    this.approvedBy = approvedBy;
    this.reason = reason;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.executionId) throw new Error('Execution id is required');
    if (!this.stepId) throw new Error('Step id is required');
    if (!this.approvedBy) throw new Error('Approved by is required');
  }
}

module.exports = { CreateWorkflowCommand, ExecuteWorkflowCommand, ApproveWorkflowStepCommand };
