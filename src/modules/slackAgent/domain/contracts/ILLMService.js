'use strict';

class ILLMService {
  async generateResponse(messages, options) {
    throw new Error('Not implemented');
  }
  async analyzeIntent(text, context) {
    throw new Error('Not implemented');
  }
  async classifyTicket(text, categories) {
    throw new Error('Not implemented');
  }
  async predictPriority(text, context) {
    throw new Error('Not implemented');
  }
  async detectSentiment(text) {
    throw new Error('Not implemented');
  }
  async detectUrgency(text) {
    throw new Error('Not implemented');
  }
  async detectDuplicates(text, existingTickets) {
    throw new Error('Not implemented');
  }
  async suggestAssignee(text, agents) {
    throw new Error('Not implemented');
  }
  async suggestResponse(text, context) {
    throw new Error('Not implemented');
  }
  async generateSummary(messages) {
    throw new Error('Not implemented');
  }
  async extractEntities(text) {
    throw new Error('Not implemented');
  }
  async moderateContent(text) {
    throw new Error('Not implemented');
  }
  async validateResponse(response, guidelines) {
    throw new Error('Not implemented');
  }
}

module.exports = ILLMService;
