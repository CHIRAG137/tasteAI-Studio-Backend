'use strict';

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

function attachIpAddress(req, _res, next) {
  req.clientIp = extractIp(req);
  req.userAgent = req.headers['user-agent'] || 'Unknown';
  next();
}

module.exports = { attachIpAddress };
