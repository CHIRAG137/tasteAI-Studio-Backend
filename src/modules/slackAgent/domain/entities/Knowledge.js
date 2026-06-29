'use strict';

class Knowledge {
  constructor({
    id,
    organizationId,
    name,
    description,
    sourceType,
    sourceUrl,
    content,
    contentType,
    fileUrl,
    fileSize,
    vectorIds,
    indexStatus,
    embeddingModel,
    chunkCount,
    isActive,
    tags,
    metadata,
    uploadedById,
    lastIndexedAt,
    expiresAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.sourceType = sourceType;
    this.sourceUrl = sourceUrl;
    this.content = content;
    this.contentType = contentType;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.vectorIds = vectorIds || [];
    this.indexStatus = indexStatus || 'pending';
    this.embeddingModel = embeddingModel;
    this.chunkCount = chunkCount || 0;
    this.isActive = isActive !== undefined ? isActive : true;
    this.tags = tags || [];
    this.metadata = metadata || {};
    this.uploadedById = uploadedById;
    this.lastIndexedAt = lastIndexedAt;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Knowledge name is required');
    }
    if (!this.sourceType) {
      throw new Error('Source type is required');
    }
  }
}

module.exports = Knowledge;
