function extractIpAddress(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp;

  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) return cfConnectingIp;

  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'Unknown'
  );
}

const attachIpAddress = (req, res, next) => {
  req.clientIp = extractIpAddress(req);
  req.userAgent = req.headers['user-agent'] || 'Unknown';
  next();
};

module.exports = {
  extractIpAddress,
  attachIpAddress,
};