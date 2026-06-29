'use strict';

class CreateTicketCommand {
  constructor({ organizationId, workspaceId, channelId, threadId, title, description, priority, category, tags, labels, customFields, source, createdById, createdByType }) {
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.channelId = channelId;
    this.threadId = threadId;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.category = category;
    this.tags = tags;
    this.labels = labels;
    this.customFields = customFields;
    this.source = source;
    this.createdById = createdById;
    this.createdByType = createdByType;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.title || !this.title.trim()) throw new Error('Ticket title is required');
  }
}

class UpdateTicketCommand {
  constructor({ ticketId, title, description, priority, category, tags, labels, customFields, status }) {
    this.ticketId = ticketId;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.category = category;
    this.tags = tags;
    this.labels = labels;
    this.customFields = customFields;
    this.status = status;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
  }
}

class AssignTicketCommand {
  constructor({ ticketId, assigneeId, organizationId }) {
    this.ticketId = ticketId;
    this.assigneeId = assigneeId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.assigneeId) throw new Error('Assignee id is required');
  }
}

class UnassignTicketCommand {
  constructor({ ticketId, organizationId }) {
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
  }
}

class TransferTicketCommand {
  constructor({ ticketId, fromUserId, toUserId, organizationId }) {
    this.ticketId = ticketId;
    this.fromUserId = fromUserId;
    this.toUserId = toUserId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.fromUserId) throw new Error('From user id is required');
    if (!this.toUserId) throw new Error('To user id is required');
  }
}

class MergeTicketsCommand {
  constructor({ sourceTicketIds, targetTicketId, organizationId }) {
    this.sourceTicketIds = sourceTicketIds;
    this.targetTicketId = targetTicketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.sourceTicketIds || this.sourceTicketIds.length < 2) throw new Error('At least 2 source ticket ids are required');
    if (!this.targetTicketId) throw new Error('Target ticket id is required');
  }
}

class SplitTicketCommand {
  constructor({ sourceTicketId, newTicketTitles, organizationId }) {
    this.sourceTicketId = sourceTicketId;
    this.newTicketTitles = newTicketTitles;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.sourceTicketId) throw new Error('Source ticket id is required');
    if (!this.newTicketTitles || !this.newTicketTitles.length) throw new Error('At least one new ticket title is required');
  }
}

class AddTicketCommentCommand {
  constructor({ ticketId, authorId, authorType, body, isInternal, attachments, organizationId }) {
    this.ticketId = ticketId;
    this.authorId = authorId;
    this.authorType = authorType;
    this.body = body;
    this.isInternal = isInternal;
    this.attachments = attachments;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.authorId) throw new Error('Author id is required');
    if (!this.body || !this.body.trim()) throw new Error('Comment body is required');
  }
}

class AddTicketAttachmentCommand {
  constructor({ ticketId, fileName, fileType, fileUrl, fileSize, uploadedById, organizationId }) {
    this.ticketId = ticketId;
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.uploadedById = uploadedById;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.fileName) throw new Error('File name is required');
    if (!this.fileUrl) throw new Error('File URL is required');
  }
}

class ChangeTicketStatusCommand {
  constructor({ ticketId, status, organizationId }) {
    this.ticketId = ticketId;
    this.status = status;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.status) throw new Error('Status is required');
  }
}

class WatchTicketCommand {
  constructor({ ticketId, userId, organizationId }) {
    this.ticketId = ticketId;
    this.userId = userId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.userId) throw new Error('User id is required');
  }
}

class FollowTicketCommand {
  constructor({ ticketId, userId, organizationId }) {
    this.ticketId = ticketId;
    this.userId = userId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) throw new Error('Ticket id is required');
    if (!this.userId) throw new Error('User id is required');
  }
}

module.exports = {
  CreateTicketCommand, UpdateTicketCommand, AssignTicketCommand, UnassignTicketCommand,
  TransferTicketCommand, MergeTicketsCommand, SplitTicketCommand,
  AddTicketCommentCommand, AddTicketAttachmentCommand, ChangeTicketStatusCommand,
  WatchTicketCommand, FollowTicketCommand,
};
