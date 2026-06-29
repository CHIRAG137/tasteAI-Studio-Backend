'use strict';

class WorkspaceContextMiddleware {
  constructor({ workspaceRepository }) {
    this.workspaceRepository = workspaceRepository;
  }

  resolve = async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (workspaceId) {
      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (workspace) {
        req.workspace = workspace;
      }
    }
    return next();
  };
}

module.exports = WorkspaceContextMiddleware;
