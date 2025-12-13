const didService = require('../services/didService');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');

exports.createTalkingVideo = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    logger.warn('CreateTalkingVideo failed: text missing');
    return responseBuilder.badRequest(res, null, 'Text is required');
  }

  logger.info('CreateTalkingVideo request received', {
    textLength: text.length,
  });

  try {
    const result = await didService.createTalkingVideo(text);

    logger.info('CreateTalkingVideo completed successfully', {
      talkId: result?.id,
    });

    return responseBuilder.ok(res, result, 'Talking video created');
  } catch (err) {
    logger.error('Error in CreateTalkingVideo', {
      error: err.response?.data || err.message,
    });

    return responseBuilder.internalError(
      res,
      null,
      err.response?.data || err.message
    );
  }
};

exports.getTalkingVideoStatus = async (req, res) => {
  const { talkId } = req.params;

  if (!talkId) {
    logger.warn('GetTalkingVideoStatus failed: talkId missing');
    return responseBuilder.badRequest(res, null, 'Talk ID is required');
  }

  logger.info('GetTalkingVideoStatus request received', {
    talkId,
  });

  try {
    const result = await didService.getTalkingVideoStatus(talkId);

    logger.info('GetTalkingVideoStatus completed successfully', {
      talkId,
      status: result?.status,
    });

    return responseBuilder.ok(res, result, 'Talk status fetched');
  } catch (err) {
    logger.error('Error in GetTalkingVideoStatus', {
      talkId,
      error: err.response?.data || err.message,
    });

    return responseBuilder.internalError(
      res,
      null,
      err.response?.data || err.message
    );
  }
};
