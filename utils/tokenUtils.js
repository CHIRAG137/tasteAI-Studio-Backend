const jwt = require('jsonwebtoken');

const TOKEN_EXPIRY = '7d'; // 7 days expiry

exports.createToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
};

exports.getTokenExpiry = () => {
  // Calculate expiry date (7 days from now)
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

exports.isTokenExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
};
