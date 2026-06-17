exports.buildDeepLink = function buildDeepLink(sessionId) {
  const base = process.env.MOBILE_DEEP_LINK_BASE || 'http://localhost:5000/auth/user/verify-qr';
  return `${base}?sessionId=${sessionId}`;
};
