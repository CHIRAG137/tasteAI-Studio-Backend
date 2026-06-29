'use strict';

class Workflow {
  constructor({ id, organizationId, name, description, trigger, conditions, steps, variables, timeout, maxRetries, isActive, isTemplate, templateId, version, createdById, executedById, status, startedAt, completedAt, error, metadata, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.trigger = trigger;
    this.conditions = conditions || [];
    this.steps = steps || [];
    this.variables = variables || {};
    this.timeout = timeout;
    this.maxRetries = maxRetries || 0;
    this.isActive = isActive !== undefined ? isActive : true;
    this.isTemplate = isTemplate || false;
    this.templateId = templateId;
    this.version = version || 1;
    this.createdById = createdById;
    this.executedById = executedById;
    this.status = status || 'draft';
    this.startedAt = startedAt;
    this.completedAt = completedAt;
    this.error = error;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Workflow name is required');
  }
}

module.exports = Workflow;
