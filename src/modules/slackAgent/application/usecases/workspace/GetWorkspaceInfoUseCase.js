'use strict';

class GetWorkspaceInfoUseCase {
  constructor({ workspaceRepository }) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(workspaceId) {
    return this.workspaceRepository.findById(workspaceId);
  }
}

module.exports = GetWorkspaceInfoUseCase;
