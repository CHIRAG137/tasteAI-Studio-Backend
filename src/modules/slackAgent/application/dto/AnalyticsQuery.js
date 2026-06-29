'use strict';

class GetTicketAnalyticsQuery {
  constructor({ organizationId, startDate, endDate, groupBy, filters }) {
    this.organizationId = organizationId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.groupBy = groupBy;
    this.filters = filters;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
  }
}

class GetSLAMetricsQuery {
  constructor({ organizationId, startDate, endDate }) {
    this.organizationId = organizationId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
  }
}

class GetCostAnalyticsQuery {
  constructor({ organizationId, startDate, endDate, groupBy }) {
    this.organizationId = organizationId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.groupBy = groupBy;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
  }
}

class GetLatencyAnalyticsQuery {
  constructor({ organizationId, startDate, endDate, service }) {
    this.organizationId = organizationId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.service = service;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
  }
}

module.exports = { GetTicketAnalyticsQuery, GetSLAMetricsQuery, GetCostAnalyticsQuery, GetLatencyAnalyticsQuery };
