const buckets = new Map();

/**
 * Simple in-memory fixed-window rate limiter keyed by Auth0 subject.
 * Best for single-instance deployments; use Redis for distributed deployments.
 */
exports.consumeAuth0SubRateLimit = ({
  subject,
  routeKey,
  maxRequests = 60,
  windowMs = 60 * 1000,
}) => {
  if (!subject || !routeKey) {
    return { allowed: true, remaining: maxRequests };
  }

  const now = Date.now();
  const key = `${routeKey}:${subject}`;
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: Math.max(0, maxRequests - 1) };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, remaining: Math.max(0, maxRequests - current.count) };
};
