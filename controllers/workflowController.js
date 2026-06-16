const workflowService = require('../services/workflowService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

exports.listWorkflows = async (req, res) => {
  try {
    const workflows = await workflowService.getWorkflowsByUserId(req.user._id);
    const result = workflows.map((workflow) => ({
      ...workflow.toObject(),
      id: workflow._id.toString(),
    }));
    logger.info('Workflows listed for user', { userId: req.user._id });
    return responseBuilder.ok(res, result, 'Workflows fetched successfully');
  } catch (error) {
    logger.error('Failed to list workflows', {
      error: error.message,
      userId: req.user._id,
    });
    return responseBuilder.internalError(res, null, 'Failed to fetch workflows');
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const workflow = await workflowService.createWorkflow(req.user._id, req.body);
    logger.info('Workflow created for user', {
      userId: req.user._id,
      workflowId: workflow._id,
    });
    return responseBuilder.created(res, workflow, 'Workflow created successfully');
  } catch (error) {
    logger.error('Failed to create workflow', {
      error: error.message,
      userId: req.user._id,
      body: req.body,
    });
    return responseBuilder.badRequest(res, null, 'Failed to create workflow');
  }
};

exports.getWorkflowById = async (req, res) => {
  try {
    const workflow = await workflowService.getWorkflowById(req.user._id, req.params.workflowId);
    if (!workflow) {
      return responseBuilder.notFound(res, null, 'Workflow not found');
    }
    const result = { ...workflow.toObject(), id: workflow._id.toString() };
    return responseBuilder.ok(res, result, 'Workflow fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch workflow', {
      error: error.message,
      userId: req.user._id,
      workflowId: req.params.workflowId,
    });
    return responseBuilder.internalError(res, null, 'Failed to fetch workflow');
  }
};

exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await workflowService.updateWorkflow(
      req.user._id,
      req.params.workflowId,
      req.body,
    );
    if (!workflow) {
      return responseBuilder.notFound(res, null, 'Workflow not found');
    }
    return responseBuilder.ok(res, workflow, 'Workflow updated successfully');
  } catch (error) {
    logger.error('Failed to update workflow', {
      error: error.message,
      userId: req.user._id,
      workflowId: req.params.workflowId,
    });
    return responseBuilder.internalError(res, null, 'Failed to update workflow');
  }
};
