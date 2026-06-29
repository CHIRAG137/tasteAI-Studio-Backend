'use strict';

class CreateDepartmentCommand {
  constructor({ organizationId, name, description, headUserId, parentDepartmentId }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.headUserId = headUserId;
    this.parentDepartmentId = parentDepartmentId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Department name is required');
  }
}

class CreateTeamCommand {
  constructor({ organizationId, name, description, departmentId, leadUserId, skills }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.departmentId = departmentId;
    this.leadUserId = leadUserId;
    this.skills = skills;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Team name is required');
  }
}

class CreateCategoryCommand {
  constructor({ organizationId, name, description, parentCategoryId, subCategories }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.parentCategoryId = parentCategoryId;
    this.subCategories = subCategories;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Category name is required');
  }
}

class CreateTagCommand {
  constructor({ organizationId, name, color, description }) {
    this.organizationId = organizationId;
    this.name = name;
    this.color = color;
    this.description = description;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Tag name is required');
  }
}

class CreateBusinessHoursCommand {
  constructor({ organizationId, name, timezone, days }) {
    this.organizationId = organizationId;
    this.name = name;
    this.timezone = timezone;
    this.days = days;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Business hours name is required');
  }
}

class CreateHolidayCommand {
  constructor({ organizationId, name, date, recurrence }) {
    this.organizationId = organizationId;
    this.name = name;
    this.date = date;
    this.recurrence = recurrence;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Holiday name is required');
    if (!this.date) throw new Error('Holiday date is required');
  }
}

module.exports = { CreateDepartmentCommand, CreateTeamCommand, CreateCategoryCommand, CreateTagCommand, CreateBusinessHoursCommand, CreateHolidayCommand };
