'use strict';

/**
 * Extracts the client IP address from the request, in priority order:
 *   1. X-Forwarded-For (reverse proxy / CDN)
 *   2. X-Real-IP (Nginx proxy)
 *   3. CF-Connecting-IP (Cloudflare)
 *   4. Socket remote address (direct connection)
 */
function extractIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    return xff.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.trim();
  }

  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return cfIp.trim();
  }

  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'Unknown';
}

/**
 * Middleware that attaches clientIp and userAgent to the request object
 * before route handlers run. Used for security logging and rate-limit context.
 */
function attachIpAddress(req, _res, next) {
  req.clientIp = extractIp(req);
  req.userAgent = req.headers['user-agent'] || 'Unknown';
  next();
}

module.exports = { attachIpAddress };
