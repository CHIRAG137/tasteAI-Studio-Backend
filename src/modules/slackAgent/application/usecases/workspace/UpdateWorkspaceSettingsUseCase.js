'use strict';

class UpdateWorkspaceSettingsUseCase {
  constructor({ workspaceRepository }) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(command) {
    return this.workspaceRepository.update(command.workspaceId, { settings: command.settings });
  }
}

module.exports = UpdateWorkspaceSettingsUseCase;
