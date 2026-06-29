'use strict';

class TriggerEscalationUseCase {
  constructor({ escalationRepository, escalationService, notificationService, auditService }) {
    this.escalationRepository = escalationRepository;
    this.escalationService = escalationService;
    this.notificationService = notificationService;
    this.auditService = auditService;
  }

  async execute(command) {
    const escalation = await this.escalationRepository.findByTicketId(command.ticketId);
    const result = await this.escalationService.escalate(escalation);
    await this.notificationService.notifyEscalation(escalation);
    await this.auditService.log('escalation.triggered', { ticketId: command.ticketId });
    return result;
  }
}

module.exports = TriggerEscalationUseCase;
