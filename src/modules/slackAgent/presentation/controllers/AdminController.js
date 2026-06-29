'use strict';

const ApiResponse = require('../../../shared/response/ApiResponse');

class AdminController {
  constructor({ slackAgentFacade }) {
    this.slackAgentFacade = slackAgentFacade;
  }

  createDepartment = async (req, res) => {
    const dept = await this.slackAgentFacade.createDepartmentUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, dept, 'Department created');
  };

  listDepartments = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  createTeam = async (req, res) => {
    const team = await this.slackAgentFacade.createTeamUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, team, 'Team created');
  };

  listTeams = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  createCategory = async (req, res) => {
    const category = await this.slackAgentFacade.createCategoryUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, category, 'Category created');
  };

  listCategories = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  createTag = async (req, res) => {
    const tag = await this.slackAgentFacade.createTagUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, tag, 'Tag created');
  };

  listTags = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  createBusinessHours = async (req, res) => {
    const hours = await this.slackAgentFacade.createBusinessHoursUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, hours, 'Business hours created');
  };

  listBusinessHours = async (req, res) => {
    return ApiResponse.success(res, []);
  };

  createHoliday = async (req, res) => {
    const holiday = await this.slackAgentFacade.createHolidayUseCase.execute({
      organizationId: req.user.organizationId || req.user.id,
      ...req.body,
    });
    return ApiResponse.created(res, holiday, 'Holiday created');
  };

  listHolidays = async (req, res) => {
    return ApiResponse.success(res, []);
  };
}

module.exports = AdminController;
