const IssueReport = require('../models/IssueReport');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

exports.createIssueReport = async (req, res) => {
  try {
    const { name, email, issueType, message, sourcePage } = req.body || {};

    if (!message || !String(message).trim()) {
      return responseBuilder.badRequest(res, null, 'Issue details are required');
    }

    const report = await IssueReport.create({
      userId: req.user._id,
      name: name || req.user.name || '',
      email: email || req.user.email || '',
      issueType: issueType || 'other',
      message: String(message).trim(),
      sourcePage: sourcePage || '/',
    });

    logger.info('Issue report submitted', {
      reportId: report._id,
      userId: req.user._id,
      issueType: report.issueType,
    });

    return responseBuilder.created(
      res,
      { id: report._id, status: report.status },
      'Issue reported successfully'
    );
  } catch (error) {
    logger.error('Failed to submit issue report', {
      error: error.message,
      userId: req.user?._id,
    });
    return responseBuilder.internalError(res, null, 'Failed to submit issue report');
  }
};
