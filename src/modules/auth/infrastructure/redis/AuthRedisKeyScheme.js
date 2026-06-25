'use strict';

const AuthRedisKeyScheme = Object.freeze({
  access: (userId) => `access:${userId}`,
  refresh: (hashed) => `refresh:${hashed}`,
  family: (familyId) => `family:${familyId}`,
});

module.exports = AuthRedisKeyScheme;
