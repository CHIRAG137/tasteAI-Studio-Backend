'use strict';

class AuditLogMiddleware {
  constructor({ auditLogRepository }) {
    this.auditLogRepository = auditLogRepository;
  }

  log = (action, resourceType) => {
    return async (req, res, next) => {
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        if (res.statusCode < 400) {
          const resourceId = req.params[`${resourceType}Id`] || body?.data?.id;
          if (resourceId) {
            setImmediate(async () => {
              try {
                await this.auditLogRepository.save({
                  organizationId: req.user?.organizationId,
                  actorId: req.user?.id || 'system',
                  actorType: 'user',
                  action,
                  resourceType,
                  resourceId,
                  metadata: { method: req.method, path: req.path },
                  ipAddress: req.clientIp || req.ip,
                });
              } catch (err) {
                console.error('Audit log error:', err.message);
              }
            });
          }
        }
        return originalJson(body);
      }.bind(this);
      return next();
    }.bind(this);
  };
}

module.exports = AuditLogMiddleware;
