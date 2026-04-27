const Workflow = require('../models/Workflow');
const SlackIntegration = require('../models/SlackIntegration');
const logger = require('../utils/logger');

exports.getWorkflowsByUserId = async (userId) => {
  logger.info('Fetching workflows for user', { userId });
  return Workflow.find({ userId }).sort({ createdAt: -1 });
};

exports.getWorkflowById = async (userId, workflowId) => {
  logger.info('Fetching workflow by id', { userId, workflowId });
  return Workflow.findOne({ _id: workflowId, userId });
};

exports.createWorkflow = async (userId, workflowData) => {
  const slackIntegration = await SlackIntegration.findOne({ userId });
  const workflow = await Workflow.create({
    userId,
    slackTeamId: slackIntegration?.slackTeamId,
    name: workflowData.name,
    description: workflowData.description || '',
    type: workflowData.type || 'custom',
    status: workflowData.status || 'draft',
    triggerType: workflowData.triggerType || 'slash_command',
    triggerValue: workflowData.triggerValue || '',
    channel: workflowData.channel || '',
    settings: workflowData.settings || {},
  });

  logger.info('Created workflow', {
    userId,
    workflowId: workflow._id,
    type: workflow.type,
  });
  return workflow;
};

exports.updateWorkflow = async (userId, workflowId, updates) => {
  logger.info('Updating workflow', { userId, workflowId, updates });
  return Workflow.findOneAndUpdate({ _id: workflowId, userId }, updates, {
    new: true,
  });
};
