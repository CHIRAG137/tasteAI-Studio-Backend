const jwt = require('jsonwebtoken');

/**
 * Best-effort auth for endpoints that are public but can accept a platform JWT.
 * If the token is missing/invalid, request continues as unauthenticated.
 *
 * This is intentionally lighter than `authMiddleware` (no DB lookups / token match checks),
 * because it's only used to allow already-authenticated dashboard users to read public resources.
 */
exports.optionalUserAuth = (req, _res, next) => {
  try {
    const authHeader = req.header('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Avoid treating agent tokens as user tokens
    if (decoded?.type === 'human_agent') return next();

    if (decoded?.id) {
      req.user = { id: decoded.id, email: decoded.email };
    }
    return next();
  } catch {
    return next();
  }
};

