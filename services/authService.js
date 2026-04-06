const bcrypt = require('bcrypt');
const axios = require('axios');
const User = require('../models/User');
const SlackIntegration = require('../models/SlackIntegration');
const logger = require('../utils/logger');
const client = require('../config/googleClient');
const { createToken, getTokenExpiry } = require('../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../utils/auth0Verify');

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
    
    // Store token and expiry in database
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    await user.save();

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
    
    // Store token and expiry in database
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    user.isActive = true;
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
exports.auth0LoginUser = async (accessToken) => {
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
    user = await User.create({
      email,
      name,
      auth0Id,
    });
    logger.info('New Auth0 user created', { email, auth0Id });
  } else {
    if (!user.auth0Id) user.auth0Id = auth0Id;
    if (name && !user.name) user.name = name;
    await user.save();
    logger.info('Auth0 user session', { userId: user._id, email });
  }

  const token = createToken(user);
  user.authToken = token;
  user.authTokenExpiresAt = getTokenExpiry();
  user.isActive = true;
  await user.save();

  return { token, user };
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
    
    // Store token and expiry in database
    user.authToken = token;
    user.authTokenExpiresAt = getTokenExpiry();
    user.isActive = true;
    await user.save();

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

// logout agent user
exports.logoutAgent = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        lastLogoutAt: new Date(), 
        isActive: false,
        authToken: null,
        authTokenExpiresAt: null
      },
      { new: true }
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
        authTokenExpiresAt: null
      },
      { new: true }
    );
    logger.info('Bot dashboard user logged out', { userId });
    return { message: 'Bot dashboard logout successful', user };
  } catch (err) {
    logger.error('Logout failed', { userId, error: err.message });
    throw new Error(`Logout failed: ${err.message}`);
  }
};
