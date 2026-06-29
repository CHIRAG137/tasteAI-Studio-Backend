'use strict';

class Classification {
  constructor({
    id,
    organizationId,
    ticketId,
    threadId,
    messageTs,
    intent,
    category,
    subCategory,
    priority,
    sentiment,
    urgency,
    confidence,
    isDuplicate,
    duplicateOfId,
    suggestedAssignee,
    suggestedResponse,
    modelUsed,
    processedAt,
    metadata,
    createdAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.ticketId = ticketId;
    this.threadId = threadId;
    this.messageTs = messageTs;
    this.intent = intent;
    this.category = category;
    this.subCategory = subCategory;
    this.priority = priority;
    this.sentiment = sentiment;
    this.urgency = urgency;
    this.confidence = confidence;
    this.isDuplicate = isDuplicate || false;
    this.duplicateOfId = duplicateOfId;
    this.suggestedAssignee = suggestedAssignee;
    this.suggestedResponse = suggestedResponse;
    this.modelUsed = modelUsed;
    this.processedAt = processedAt || new Date();
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
  }
}

module.exports = Classification;
