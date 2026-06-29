'use strict';

class GlobalSearchQuery {
  constructor({ query, organizationId, types, limit, offset }) {
    this.query = query;
    this.organizationId = organizationId;
    this.types = types;
    this.limit = limit;
    this.offset = offset;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.query || !this.query.trim()) throw new Error('Search query is required');
  }
}

class TicketSearchQuery {
  constructor({ query, organizationId, status, priority, category, assignedToId, tags, labels, limit, offset, sortBy, sortOrder }) {
    this.query = query;
    this.organizationId = organizationId;
    this.status = status;
    this.priority = priority;
    this.category = category;
    this.assignedToId = assignedToId;
    this.tags = tags;
    this.labels = labels;
    this.limit = limit;
    this.offset = offset;
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
  }
}

module.exports = { GlobalSearchQuery, TicketSearchQuery };
