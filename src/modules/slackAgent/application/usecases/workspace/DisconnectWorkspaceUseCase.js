'use strict';

class DisconnectWorkspaceUseCase {
  constructor({ workspaceRepository, auditService }) {
    this.workspaceRepository = workspaceRepository;
    this.auditService = auditService;
  }

  async execute(command) {
    await this.workspaceRepository.delete(command.workspaceId);
    await this.auditService.log('workspace.disconnected', { workspaceId: command.workspaceId, organizationId: command.organizationId });
  }
}

module.exports = DisconnectWorkspaceUseCase;
