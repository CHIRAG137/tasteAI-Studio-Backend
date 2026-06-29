'use strict';

class AIRuntimeService {
  constructor({
    llmService,
    contextBuilder,
    memoryService,
    knowledgeService,
    toolSelectionService,
    responseValidationService,
    eventBus,
  }) {
    this.llmService = llmService;
    this.contextBuilder = contextBuilder;
    this.memoryService = memoryService;
    this.knowledgeService = knowledgeService;
    this.toolSelectionService = toolSelectionService;
    this.responseValidationService = responseValidationService;
    this.eventBus = eventBus;
  }

  async analyzeIntent(text, context) {
    await this.eventBus.publish('ai.analysis.started', { text });
    const intent = await this.llmService.analyzeIntent(text, context);
    await this.eventBus.publish('ai.analysis.completed', { intent });
    return intent;
  }

  async buildContext(threadId, channelId, organizationId) {
    const conversationContext = await this.contextBuilder.build(threadId, channelId);
    const memories = await this.memoryService.retrieve(organizationId, conversationContext);
    const knowledge = await this.knowledgeService.search(organizationId, conversationContext);
    return { ...conversationContext, memories, knowledge };
  }

  async selectAndExecuteTools(context) {
    const selectedTools = await this.toolSelectionService.select(context);
    const results = [];
    for (const tool of selectedTools) {
      const result = await tool.execute(context);
      results.push(result);
    }
    return results;
  }

  async generateResponse(context) {
    const response = await this.llmService.generateResponse(context.messages, context.options);
    const validation = await this.responseValidationService.validate(response, context.guidelines);
    return { response, validation };
  }

  async requestHumanApproval(response, context) {
    await this.eventBus.publish('ai.approval.requested', { response, context });
    return new Promise((resolve) => {
      this.eventBus.subscribe('ai.approval.granted', (event) => resolve(event));
      this.eventBus.subscribe('ai.approval.rejected', (event) => resolve(event));
    });
  }

  async sendToSlack(channelId, message, threadTs) {
    await this.eventBus.publish('slack.message.sending', { channelId, message });
    return { channelId, message, threadTs };
  }
}

module.exports = AIRuntimeService;
