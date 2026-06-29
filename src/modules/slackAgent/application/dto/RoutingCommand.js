'use strict';

class CreateRoutingRuleCommand {
  constructor({
    organizationId,
    name,
    description,
    priority,
    conditions,
    targetType,
    targetId,
    loadBalancingStrategy,
    order,
  }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.conditions = conditions;
    this.targetType = targetType;
    this.targetId = targetId;
    this.loadBalancingStrategy = loadBalancingStrategy;
    this.order = order;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Rule name is required');
    }
    if (!this.targetType) {
      throw new Error('Target type is required');
    }
    if (!this.targetId) {
      throw new Error('Target id is required');
    }
  }
}

class RouteTicketCommand {
  constructor({ ticketId, organizationId }) {
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) {
      throw new Error('Ticket id is required');
    }
  }
}

module.exports = { CreateRoutingRuleCommand, RouteTicketCommand };
