const livekitService = require('../services/livekitService');
const responseBuilder = require('../utils/responseBuilder');
const logger = require('../utils/logger');

exports.getToken = async (req, res) => {
  try {
    const { room, identity } = req.body;

    if (!room || !identity) {
      logger.warn('LiveKit token request missing parameters', {
        room,
        identity,
      });
      return responseBuilder.badRequest(
        res,
        null,
        'room and identity are required'
      );
    }

    logger.info('Generating LiveKit token', {
      room,
      identity,
    });

    const token = await livekitService.createToken({ room, identity });

    logger.info('LiveKit token generated successfully', {
      room,
      identity,
    });

    return responseBuilder.ok(res, { token }, 'LiveKit token generated');
  } catch (err) {
    logger.error('Failed to generate LiveKit token', {
      error: err.message,
      stack: err.stack,
    });

    return responseBuilder.internalError(
      res,
      null,
      err.message || 'LiveKit token generation failed'
    );
  }
};
