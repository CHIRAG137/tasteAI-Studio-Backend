'use strict';

class QAContentProcessor {
  async generateQAs(_chunk, _options) {
    throw new Error(`${this.constructor.name}.generateQAs() not implemented`);
  }

  async generateEmbedding(_text, _options) {
    throw new Error(`${this.constructor.name}.generateEmbedding() not implemented`);
  }
}

module.exports = QAContentProcessor;
