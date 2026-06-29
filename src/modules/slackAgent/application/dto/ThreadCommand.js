'use strict';

class LinkThreadToTicketCommand {
  constructor({ threadId, ticketId, organizationId }) {
    this.threadId = threadId;
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.threadId) {
      throw new Error('Thread id is required');
    }
    if (!this.ticketId) {
      throw new Error('Ticket id is required');
    }
  }
}

class SyncThreadCommand {
  constructor({ threadId, workspaceId }) {
    this.threadId = threadId;
    this.workspaceId = workspaceId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.threadId) {
      throw new Error('Thread id is required');
    }
  }
}

class GenerateThreadSummaryCommand {
  constructor({ threadId, organizationId }) {
    this.threadId = threadId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.threadId) {
      throw new Error('Thread id is required');
    }
  }
}

module.exports = { LinkThreadToTicketCommand, SyncThreadCommand, GenerateThreadSummaryCommand };
