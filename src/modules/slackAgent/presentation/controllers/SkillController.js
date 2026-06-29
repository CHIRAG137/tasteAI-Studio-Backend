'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class SkillController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  register = async (req, res) => {
    const skill = await this.slackAgentFacade.registerSkillUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, skill, 'Skill registered');
  };

  list = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  getById = async (req, res) => {
    return ApiResponse.success(res, {});
  };

  toggle = async (req, res) => {
    const skill = await this.slackAgentFacade.toggleSkillUseCase.execute({
      skillId: req.params.skillId,
      isEnabled: req.body.isEnabled,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, skill, `Skill ${req.body.isEnabled ? 'enabled' : 'disabled'}`);
  };

  configure = async (req, res) => {
    const skill = await this.slackAgentFacade.configureSkillUseCase.execute({
      skillId: req.params.skillId,
      configuration: req.body.configuration,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, skill, 'Skill configured');
  };

  execute = async (req, res) => {
    const result = await this.slackAgentFacade.executeSkillUseCase.execute({
      skillId: req.params.skillId,
      input: req.body.input,
      context: req.body.context,
      organizationId: req.user.organizationId || req.user.id,
    });
    return ApiResponse.success(res, result);
  };

  getVersions = async (req, res) => {
    return ApiResponse.success(res, []);
  };
}

module.exports = SkillController;
