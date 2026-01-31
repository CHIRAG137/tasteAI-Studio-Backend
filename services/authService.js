const bcrypt = require('bcrypt');
const User = require('../models/User');
const SlackIntegration = require('../models/SlackIntegration');
const logger = require('../utils/logger');
const client = require('../config/googleClient');
const { createToken } = require('../utils/tokenUtils');

// register user
exports.registerUser = async (email, password, name) => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, name });
    const token = createToken(user);

    logger.info('User registered in service', { userId: user._id, email });
    return { token, user };
  } catch (err) {
    logger.error('Error in register service', { error: err.message, email });
    throw err;
  }
};

// login user
exports.loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user || !user.password) {
      logger.warn('Login failed - invalid credentials', { email });
      throw new Error('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.warn('Login failed - wrong password', { email });
      throw new Error('Invalid credentials');
    }

    const token = createToken(user);
    logger.info('User logged in successfully', { userId: user._id, email });
    return { token, user };
  } catch (err) {
    logger.error('Error in login service', { error: err.message, email });
    throw err;
  }
};

// user login via google login
exports.googleLoginUser = async (googleToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name, googleId });
      logger.info('New Google user created', { email, googleId });
    } else {
      logger.info('Google user logged in', { userId: user._id, email });
    }

    const token = createToken(user);
    return { token, user };
  } catch (err) {
    logger.error('Error in Google login service', { error: err.message });
    throw err;
  }
};

// get user details by user id
exports.getUserDetailsByUserId = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      logger.warn('User not found in getUserDetails', { userId });
      return null;
    }

    const slackIntegration = await SlackIntegration.findOne({ userId });

    logger.info('Fetched user details', {
      userId,
      hasSlack: !!slackIntegration,
    });

    return {
      user,
      hasSlackIntegration: !!slackIntegration,
      slackIntegration: slackIntegration
        ? {
            teamId: slackIntegration.slackTeamId,
            teamName: slackIntegration.slackTeamName,
            authedUserId: slackIntegration.slackAuthedUserId,
          }
        : null,
    };
  } catch (err) {
    logger.error('Error in getUserDetails service', {
      error: err.message,
      userId,
    });
    throw err;
  }
};
