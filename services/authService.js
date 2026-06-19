const User = require('../models/User');
const logger = require('../utils/logger');

exports.getLastLoginInfo = async ({ email, deviceId, ip }) => {
  try {
    let query = {};
    if (email) {
      query = { email };
    } else if (deviceId) {
      query = { 'lastLogin.deviceId': deviceId };
    } else if (ip) {
      query = { 'lastLogin.ip': ip };
    }
    const user = await User.findOne(query).select('lastLogin');
    return user ? user.lastLogin : null;
  } catch (err) {
    logger.error('Error fetching last login info', { error: err.message, email, deviceId, ip });
    throw err;
  }
};

function normalizeName(name) {
  if (typeof name !== 'string') {
    return null;
  }
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return '';
  }
  return trimmed;
}

// update my profile fields (currently supports name)
exports.updateMyProfile = async (userId, { name } = {}) => {
  try {
    const nextName = normalizeName(name);
    if (nextName === null) {
      throw new Error('name must be a string');
    }
    if (nextName.length > 80) {
      throw new Error('name must be 80 characters or fewer');
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn('User not found in updateMyProfile', { userId });
      throw new Error('User not found');
    }

    user.name = nextName;
    await user.save();

    const safeUser = await User.findById(userId).select('-password');
    return { user: safeUser };
  } catch (err) {
    logger.error('Error in updateMyProfile service', {
      error: err.message,
      userId,
    });
    throw err;
  }
};

// logout agent user
exports.logoutAgent = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        lastLogoutAt: new Date(),
        isActive: false,
        authToken: null,
        authTokenExpiresAt: null,
      },
      { new: true },
    );
    logger.info('Agent logged out', { userId });
    return { message: 'Agent logout successful', user };
  } catch (err) {
    logger.error('Logout failed', { userId, error: err.message });
    throw new Error(`Logout failed: ${err.message}`);
  }
};

// logout bot dashboard user
exports.logoutBot = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        lastLogoutAt: new Date(),
        isActive: false,
        authToken: null,
        authTokenExpiresAt: null,
      },
      { new: true },
    );
    logger.info('Bot dashboard user logged out', { userId });
    return { message: 'Bot dashboard logout successful', user };
  } catch (err) {
    logger.error('Logout failed', { userId, error: err.message });
    throw new Error(`Logout failed: ${err.message}`);
  }
};
