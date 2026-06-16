'use strict';

/**
 * Extract the real client IP, respecting common proxy headers.
 * Trust order: X-Forwarded-For → X-Real-IP → CF-Connecting-IP → socket remote address.
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

  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown';
}

/**
 * Attach clientIp and userAgent to req for downstream use.
 */
exports.attachIpAddress = function (req, _res, next) {
  req.clientIp = extractIp(req);
  req.userAgent = req.headers['user-agent'] || 'Unknown';
  next();
};
