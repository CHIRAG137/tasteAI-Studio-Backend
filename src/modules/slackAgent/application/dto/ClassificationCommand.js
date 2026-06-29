'use strict';

class ClassifyTicketCommand {
  constructor({ ticketId, organizationId, text, context }) {
    this.ticketId = ticketId;
    this.organizationId = organizationId;
    this.text = text;
    this.context = context;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.ticketId) {
      throw new Error('Ticket id is required');
    }
    if (!this.text) {
      throw new Error('Text is required for classification');
    }
  }
}

class DetectIntentCommand {
  constructor({ text, context, organizationId }) {
    this.text = text;
    this.context = context;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.text) {
      throw new Error('Text is required');
    }
  }
}

class FindSimilarTicketsCommand {
  constructor({ ticketId, limit, organizationId }) {
    this.ticketId = ticketId;
    this.limit = limit;
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

module.exports = { ClassifyTicketCommand, DetectIntentCommand, FindSimilarTicketsCommand };
