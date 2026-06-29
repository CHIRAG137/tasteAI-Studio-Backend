'use strict';

class Skill {
  constructor({
    id,
    organizationId,
    name,
    description,
    type,
    version,
    isEnabled,
    configuration,
    permissions,
    entryPoint,
    dependencies,
    metadata,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.type = type;
    this.version = version || '1.0.0';
    this.isEnabled = isEnabled !== undefined ? isEnabled : true;
    this.configuration = configuration || {};
    this.permissions = permissions || {};
    this.entryPoint = entryPoint;
    this.dependencies = dependencies || [];
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Skill name is required');
    }
    if (!this.type) {
      throw new Error('Skill type is required');
    }
  }
}

module.exports = Skill;
