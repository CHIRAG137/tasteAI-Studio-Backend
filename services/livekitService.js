const { AccessToken } = require('livekit-server-sdk');
const logger = require('../utils/logger');

exports.createToken = async ({ room, identity }) => {
  if (!room || !identity) {
    logger.error('LiveKit token creation failed: missing parameters', {
      room,
      identity,
    });
    throw new Error('room and identity are required to create LiveKit token');
  }

  logger.info('Starting LiveKit token creation', {
    room,
    identity,
  });

  try {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity }
    );

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    logger.info('LiveKit token created successfully', {
      room,
      identity,
      tokenLength: jwt.length,
    });

    return jwt;
  } catch (error) {
    logger.error('Error during LiveKit token creation', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
