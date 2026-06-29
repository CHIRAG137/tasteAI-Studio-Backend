'use strict';

class RoutingRule {
  constructor({ id, organizationId, name, description, priority, conditions, targetType, targetId, isActive, fallbackRuleId, loadBalancingStrategy, order, metadata, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.priority = priority || 0;
    this.conditions = conditions || {};
    this.targetType = targetType;
    this.targetId = targetId;
    this.isActive = isActive !== undefined ? isActive : true;
    this.fallbackRuleId = fallbackRuleId;
    this.loadBalancingStrategy = loadBalancingStrategy;
    this.order = order || 0;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Routing rule name is required');
    if (!this.targetType) throw new Error('Target type is required');
    if (!this.targetId) throw new Error('Target id is required');
  }
}

module.exports = RoutingRule;
