'use strict';

class UploadKnowledgeCommand {
  constructor({ organizationId, name, description, sourceType, sourceUrl, content, fileUrl, fileSize, tags, metadata, uploadedById }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.sourceType = sourceType;
    this.sourceUrl = sourceUrl;
    this.content = content;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.tags = tags;
    this.metadata = metadata;
    this.uploadedById = uploadedById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Knowledge name is required');
    if (!this.sourceType) throw new Error('Source type is required');
  }
}

class IndexKnowledgeCommand {
  constructor({ knowledgeId, organizationId }) {
    this.knowledgeId = knowledgeId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.knowledgeId) throw new Error('Knowledge id is required');
  }
}

class SearchKnowledgeCommand {
  constructor({ query, organizationId, sourceType, limit }) {
    this.query = query;
    this.organizationId = organizationId;
    this.sourceType = sourceType;
    this.limit = limit;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.query || !this.query.trim()) throw new Error('Search query is required');
  }
}

module.exports = { UploadKnowledgeCommand, IndexKnowledgeCommand, SearchKnowledgeCommand };
