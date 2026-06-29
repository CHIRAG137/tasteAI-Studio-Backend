'use strict';

class ListWorkspacesUseCase {
  constructor({ workspaceRepository }) {
    this.workspaceRepository = workspaceRepository;
  }

  async execute(organizationId) {
    return this.workspaceRepository.findByOrganizationId(organizationId);
  }
}

module.exports = ListWorkspacesUseCase;
