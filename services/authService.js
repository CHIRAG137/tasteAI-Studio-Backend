const bcrypt = require('bcrypt');
const axios = require('axios');
const User = require('../models/User');
const SlackIntegration = require('../models/SlackIntegration');
const logger = require('../utils/logger');
const client = require('../config/googleClient');
const { createToken, getTokenExpiry } = require('../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../utils/auth0Verify');

function setLastLogin(user, method, ip = 'Unknown', device = 'Unknown', deviceId = null) {
  user.lastLogin = {
    method,
    ip,
    device,
    deviceId,
    at: new Date(),
  };
}

// register user (supports cross-method account linking)
exports.registerUser = async (email, password, name, loginMeta = {}) => {
  try {
    let user = await User.findOne({ email });

    if (user) {
      // User exists from another auth method (Auth0 or Google)
      // Allow cross-method registration by linking password to existing account
      if (user.password) {
        // User already has a password from email/password method
        logger.warn('Registration attempt with existing email and password', { email });
        throw new Error('User already exists');
      }
      // Link password to existing user from OAuth method
      user.password = await bcrypt.hash(password, 10);
      if (!user.name && name) {
        user.name = name;
      }
      logger.info('Cross-method registration: linked password to OAuth user', {
        userId: user._id,
        email,
      });
    } else {
      // New user registration
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({ email, password: hashedPassword, name });
      logger.info('New user registered via email/password', { userId: user._id, email });
    }

    const token = createToken(user);
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    setLastLogin(user, 'email_password', loginMeta.ip, loginMeta.device, loginMeta.deviceId);
    await user.save();

    logger.info('User registered in service', { userId: user._id, email });
    return { token, user };
  } catch (err) {
    logger.error('Error in register service', { error: err.message, email });
    throw err;
  }
};

// login user (supports cross-method login)
exports.loginUser = async (email, password, loginMeta = {}) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failed - user not found', { email });
      throw new Error('Invalid credentials');
    }

    // If user has no password, they registered via Auth0/Google
    if (!user.password) {
      logger.warn('Login failed - user has no password (registered via OAuth)', { email });
      throw new Error(
        'This email is registered with Auth0 or Google. Please login using your original method.',
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      logger.warn('Login failed - wrong password', { email });
      throw new Error('Invalid credentials');
    }

    const token = createToken(user);

    // Store token, expiry, and last login metadata in database
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    user.isActive = true;
    setLastLogin(user, 'email_password', loginMeta.ip, loginMeta.device, loginMeta.deviceId);
    await user.save();

    logger.info('User logged in successfully', { userId: user._id, email });
    return { token, user };
  } catch (err) {
    logger.error('Error in login service', { error: err.message, email });
    throw err;
  }
};

async function fetchAuth0UserInfo(accessToken) {
  const domain = process.env.AUTH0_DOMAIN;
  const { data } = await axios.get(`https://${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  return data;
}

// login or register via Auth0 (access token from SPA after Universal Login)
exports.auth0LoginUser = async (accessToken, loginMeta = {}) => {
  const decoded = await verifyAuth0AccessToken(accessToken);
  const auth0Id = decoded.sub;

  let email = decoded.email;
  let name = decoded.name || decoded.nickname;

  if (!email) {
    try {
      const info = await fetchAuth0UserInfo(accessToken);
      email = info.email;
      name = name || info.name || info.nickname;
    } catch (e) {
      logger.error('Auth0 userinfo failed', { error: e.message });
      throw new Error(
        'Could not resolve user email — enable openid profile email scopes and/or the /userinfo call',
      );
    }
  }

  if (!email) {
    throw new Error('Email is required from Auth0 token or userinfo');
  }

  let user = await User.findOne({ $or: [{ auth0Id }, { email }] });
  if (!user) {
    // New Auth0 user
    user = await User.create({
      email,
      name,
      auth0Id,
    });
    logger.info('New Auth0 user created', { email, auth0Id });
  } else {
    // Link Auth0 to existing user or update existing Auth0 user
    if (!user.auth0Id) {
      user.auth0Id = auth0Id;
      logger.info('Cross-method: linked Auth0 to existing user', { userId: user._id, email });
    }
    if (name && !user.name) {
      user.name = name;
    }
    await user.save();
    logger.info('Auth0 user session (cross-method or existing)', { userId: user._id, email });
  }

  const token = createToken(user);
  user.authToken = token;
  user.authTokenExpiresAt = getTokenExpiry();
  user.isActive = true;
  setLastLogin(user, 'auth0', loginMeta.ip, loginMeta.device, loginMeta.deviceId);
  await user.save();

  return { token, user };
};

// user login via google login
exports.googleLoginUser = async (googleToken, loginMeta = {}) => {
  try {
    // Try to verify as ID token first (for credential flow)
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // If ID token verification fails, treat as access token and fetch user info
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${googleToken}` },
      });
      payload = response.data;
      if (!payload.id) {
        payload.id = payload.userid;
      }
    }

    const { email, name, sub: googleId, id } = payload;
    const finalGoogleId = googleId || id;

    let user = await User.findOne({ $or: [{ email }, { googleId: finalGoogleId }] });
    if (!user) {
      // New Google user
      user = await User.create({ email, name, googleId: finalGoogleId });
      logger.info('New Google user created', { email, googleId: finalGoogleId });
    } else {
      // Link Google to existing user or update existing Google user
      if (!user.googleId && finalGoogleId) {
        user.googleId = finalGoogleId;
        logger.info('Cross-method: linked Google to existing user', { userId: user._id, email });
      }
      if (name && !user.name) {
        user.name = name;
      }
      logger.info('Google user logged in (cross-method or existing)', { userId: user._id, email });
    }

    const token = createToken(user);

    // Store token, expiry, and last login metadata in database
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    user.isActive = true;
    setLastLogin(user, 'google', loginMeta.ip, loginMeta.device, loginMeta.deviceId);
    await user.save();

    return { token, user };
  } catch (err) {
    logger.error('Error in Google login service', { error: err.message });
    throw err;
  }
};

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
