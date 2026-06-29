'use strict';

class RegisterSkillCommand {
  constructor({ organizationId, name, description, type, version, configuration, entryPoint, dependencies, createdById }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.type = type;
    this.version = version;
    this.configuration = configuration;
    this.entryPoint = entryPoint;
    this.dependencies = dependencies;
    this.createdById = createdById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Skill name is required');
    if (!this.type) throw new Error('Skill type is required');
  }
}

class ToggleSkillCommand {
  constructor({ skillId, isEnabled, organizationId }) {
    this.skillId = skillId;
    this.isEnabled = isEnabled;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.skillId) throw new Error('Skill id is required');
    if (this.isEnabled === undefined) throw new Error('isEnabled flag is required');
  }
}

class ConfigureSkillCommand {
  constructor({ skillId, configuration, organizationId }) {
    this.skillId = skillId;
    this.configuration = configuration;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.skillId) throw new Error('Skill id is required');
    if (!this.configuration) throw new Error('Configuration is required');
  }
}

class ExecuteSkillCommand {
  constructor({ skillId, input, context, organizationId }) {
    this.skillId = skillId;
    this.input = input;
    this.context = context;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.skillId) throw new Error('Skill id is required');
    if (!this.input) throw new Error('Input is required');
  }
}

module.exports = { RegisterSkillCommand, ToggleSkillCommand, ConfigureSkillCommand, ExecuteSkillCommand };
