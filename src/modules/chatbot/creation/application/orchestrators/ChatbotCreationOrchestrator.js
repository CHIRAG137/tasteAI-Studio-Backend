'use strict';

class ChatbotCreationOrchestrator {
  constructor({
    chatbotRepository,
    slackValidationService,
    slackJoinService,
    llmValidationService,
    customizationProvisioningService,
    humanAgentProvisioningService,
    qaKnowledgeProvisioningService,
    logger,
  }) {
    this.chatbotRepository = chatbotRepository;
    this.slackValidationService = slackValidationService;
    this.slackJoinService = slackJoinService;
    this.llmValidationService = llmValidationService;
    this.customizationProvisioningService = customizationProvisioningService;
    this.humanAgentProvisioningService = humanAgentProvisioningService;
    this.qaKnowledgeProvisioningService = qaKnowledgeProvisioningService;
    this.logger = logger;
  }

  async create({ chatbot, command }) {
    await this.slackValidationService.validate({
      userId: command.userId,
      slackChannelId: command.slackChannelId,
    });

    await this.llmValidationService.validate({
      provider: command.llmProvider,
      model: command.llmModel,
      encryptedApiKey: command.encryptedApiKey,
    });

    const createdBot = await this.chatbotRepository.create(chatbot);

    await this.customizationProvisioningService.createDefaults({
      botId: createdBot._id,
      botName: command.name,
    });

    const agentProvisioningResult =
      command.humanHandoffEnabled && command.humanHandoffEmails.length > 0
        ? await this.humanAgentProvisioningService.provision({
            botId: createdBot._id,
            invitedBy: command.userId,
            emails: command.humanHandoffEmails,
            botName: command.name,
          })
        : { agentsCount: 0, existingAgents: [] };

    const processingPromises = [];

    const hasScrapedContent = command.scrapedContent && command.scrapedContent.length > 0;
    const hasFiles = command.files && command.files.length > 0;

    if (hasScrapedContent || hasFiles) {
      processingPromises.push(
        this.qaKnowledgeProvisioningService
          .train({
            botId: createdBot._id,
            scrapedContent: command.scrapedContent,
            files: command.files,
          })
          .catch((err) => {
            this.logger.error('Knowledge training failed', {
              botId: createdBot._id,
              error: err.message,
            });
            return { markdownQAs: 0, fileQAs: 0, trainingFilesMeta: [] };
          }),
      );
    }

    if (command.isSlackEnabled && command.slackChannelId) {
      processingPromises.push(
        this.slackJoinService
          .join({
            userId: command.userId,
            channelId: command.slackChannelId,
          })
          .catch((err) => {
            this.logger.error('Slack join failed', { botId: createdBot._id, error: err.message });
            return { slackJoined: false };
          }),
      );
    }

    let markdownQAs = 0;
    let fileQAs = 0;
    let trainingFilesMeta = [];
    let slackJoined = false;

    if (processingPromises.length > 0) {
      const results = await Promise.allSettled(processingPromises);

      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return;
        }
        const val = result.value;
        if ('markdownQAs' in val) {
          markdownQAs = val.markdownQAs || 0;
          fileQAs = val.fileQAs || 0;
          trainingFilesMeta = val.trainingFilesMeta || [];
        } else if ('slackJoined' in val) {
          slackJoined = val.slackJoined;
        }
      });
    }

    if (trainingFilesMeta.length > 0) {
      try {
        await this.chatbotRepository.update(createdBot._id, { training_files: trainingFilesMeta });
      } catch (err) {
        this.logger.error('Failed to save training file metadata', {
          botId: createdBot._id,
          error: err.message,
        });
      }
    }

    const humanHandoffEnabled = command.humanHandoffEnabled === true;
    const parsedHumanEmails = command.humanHandoffEmails || [];
    const scrapedPagesCount = command.scrapedContent ? command.scrapedContent.length : 0;
    const filesCount = command.files ? command.files.length : 0;

    const messageParts = [`Bot "${command.name}" created successfully`];

    const capabilities = [];
    if (command.isVoiceEnabled) {
      capabilities.push('voice');
    }
    if (command.isVideoBot) {
      capabilities.push('video');
    }
    if (capabilities.length > 0) {
      messageParts.push(`with ${capabilities.join(' & ')} support`);
    }

    if (command.supportedLanguages && command.supportedLanguages.length > 0) {
      messageParts.push(`supporting ${command.supportedLanguages.length} language(s)`);
    }

    const processedSources = [];
    if (markdownQAs > 0) {
      processedSources.push(`${scrapedPagesCount} scraped page(s) (${markdownQAs} Q&As)`);
    }
    if (fileQAs > 0) {
      processedSources.push(`${filesCount} uploaded file(s) (${fileQAs} Q&As)`);
    }
    if (processedSources.length > 0) {
      messageParts.push(`trained on ${processedSources.join(' and ')}`);
    }

    if (humanHandoffEnabled && parsedHumanEmails.length > 0) {
      messageParts.push(
        `with human handoff enabled for ${agentProvisioningResult.agentsCount} agent(s)`,
      );
    }

    if (slackJoined) {
      messageParts.push('and connected to Slack');
    }

    const message = `${messageParts.join(', ')}.`;

    return {
      message,
      chatbot: createdBot,
      scrapedContent: {
        pages: scrapedPagesCount,
        qas: markdownQAs,
      },
      files: {
        uploaded: filesCount > 0,
        count: filesCount,
        qas: fileQAs,
      },
      totalQAs: markdownQAs + fileQAs,
      integrations: {
        slack: {
          enabled: command.isSlackEnabled,
          channelId: command.slackChannelId || null,
          connected: slackJoined,
        },
        humanHandoff: {
          enabled: humanHandoffEnabled,
          agentCount: agentProvisioningResult.agentsCount,
          agentEmails: parsedHumanEmails,
        },
      },
      meta: {
        createdBy: command.userId,
      },
    };
  }
}

module.exports = ChatbotCreationOrchestrator;
