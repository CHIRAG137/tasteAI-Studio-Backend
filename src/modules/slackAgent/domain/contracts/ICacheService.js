'use strict';

class ICacheService {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, value, ttlSeconds) { throw new Error('Not implemented'); }
  async delete(key) { throw new Error('Not implemented'); }
  async exists(key) { throw new Error('Not implemented'); }
  async increment(key) { throw new Error('Not implemented'); }
  async getOrSet(key, factory, ttlSeconds) { throw new Error('Not implemented'); }
}

module.exports = ICacheService;
