'use strict';

class Ticket {
  constructor({
    id,
    organizationId,
    workspaceId,
    channelId,
    threadId,
    title,
    description,
    status,
    priority,
    category,
    assignedToId,
    assignedTeamId,
    createdById,
    createdByType,
    source,
    tags,
    labels,
    customFields,
    slaPolicyId,
    slaDueAt,
    firstResponseAt,
    resolvedAt,
    closedAt,
    reopenedAt,
    mergedIntoId,
    mergedTicketIds,
    splitFromId,
    escalationLevel,
    isEscalated,
    satisfactionScore,
    metadata,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.channelId = channelId;
    this.threadId = threadId;
    this.title = title;
    this.description = description;
    this.status = status || 'open';
    this.priority = priority || 'medium';
    this.category = category;
    this.assignedToId = assignedToId;
    this.assignedTeamId = assignedTeamId;
    this.createdById = createdById;
    this.createdByType = createdByType || 'user';
    this.source = source || 'slack';
    this.tags = tags || [];
    this.labels = labels || [];
    this.customFields = customFields || {};
    this.slaPolicyId = slaPolicyId;
    this.slaDueAt = slaDueAt;
    this.firstResponseAt = firstResponseAt;
    this.resolvedAt = resolvedAt;
    this.closedAt = closedAt;
    this.reopenedAt = reopenedAt;
    this.mergedIntoId = mergedIntoId;
    this.mergedTicketIds = mergedTicketIds || [];
    this.splitFromId = splitFromId;
    this.escalationLevel = escalationLevel || 0;
    this.isEscalated = isEscalated || false;
    this.satisfactionScore = satisfactionScore;
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.title || !this.title.trim()) {
      throw new Error('Ticket title is required');
    }
  }
}

module.exports = Ticket;
