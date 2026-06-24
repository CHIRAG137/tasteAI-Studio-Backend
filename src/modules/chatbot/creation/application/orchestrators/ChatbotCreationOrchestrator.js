'use strict';

class ChatbotCreationOrchestrator {
  constructor({
    slackValidationService,
    llmValidationService,

    chatbotRepository,

    customizationProvisioningService,
    humanAgentProvisioningService,
    qaKnowledgeProvisioningService,
  }) {
    this.slackValidationService = slackValidationService;

    this.llmValidationService = llmValidationService;

    this.chatbotRepository = chatbotRepository;

    this.customizationProvisioningService = customizationProvisioningService;

    this.humanAgentProvisioningService = humanAgentProvisioningService;

    this.qaKnowledgeProvisioningService = qaKnowledgeProvisioningService;
  }

  async create({ chatbot, command }) {
    await this.validateSlack(command);

    await this.validateLLM(command);

    const createdBot = await this.chatbotRepository.create(chatbot);

    await this.createCustomization(createdBot.id);

    await this.provisionHumanAgents(createdBot.id, command);

    await this.trainKnowledge(createdBot.id, command);

    return createdBot;
  }

  async validateSlack(command) {
    if (!command.isSlackEnabled) {
      return;
    }

    await this.slackValidationService.validate({
      userId: command.userId,
      slackChannelId: command.slackChannelId,
    });
  }

  async validateLLM(command) {
    if (!command.llmProvider) {
      return;
    }

    await this.llmValidationService.validate({
      provider: command.llmProvider,

      model: command.llmModel,

      encryptedApiKey: command.encryptedApiKey,
    });
  }

  async createCustomization(botId) {
    await this.customizationProvisioningService.createDefaults({
      botId,
    });
  }

  async provisionHumanAgents(botId, command) {
    if (!command.humanHandoffEnabled) {
      return;
    }

    await this.humanAgentProvisioningService.provision({
      botId,

      invitedBy: command.userId,

      emails: command.humanHandoffEmails,
    });
  }

  async trainKnowledge(botId, command) {
    const hasFiles = command.files?.length > 0;

    const hasUrls = command.scrapedUrls?.length > 0;

    if (!hasFiles && !hasUrls) {
      return;
    }

    await this.qaKnowledgeProvisioningService.train({
      botId,

      files: command.files,

      urls: command.scrapedUrls,
    });
  }
}

module.exports = ChatbotCreationOrchestrator;
