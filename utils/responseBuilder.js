'use strict';

function build(res, statusCode, status, message, result = null) {
  return res.status(statusCode).json({ status, message, result });
}

module.exports = {
  ok:                  (res, result, msg = 'OK')                    => build(res, 200, 'success', msg, result),
  created:             (res, result, msg = 'Created')               => build(res, 201, 'success', msg, result),
  accepted:            (res, result, msg = 'Accepted')              => build(res, 202, 'success', msg, result),
  noContent:           (res, msg = 'No Content')                    => build(res, 204, 'success', msg, null),
  badRequest:          (res, err, msg = 'Bad Request')              => build(res, 400, 'error',   msg, err),
  unauthorized:        (res, err, msg = 'Unauthorized')             => build(res, 401, 'error',   msg, err),
  forbidden:           (res, err, msg = 'Forbidden')                => build(res, 403, 'error',   msg, err),
  notFound:            (res, err, msg = 'Not Found')                => build(res, 404, 'error',   msg, err),
  conflict:            (res, err, msg = 'Conflict')                 => build(res, 409, 'error',   msg, err),
  unprocessableEntity: (res, err, msg = 'Unprocessable Entity')     => build(res, 422, 'error',   msg, err),
  tooManyRequests:     (res, err, msg = 'Too Many Requests')        => build(res, 429, 'error',   msg, err),
  internalError:       (res, err, msg = 'Internal Server Error')    => build(res, 500, 'error',   msg, err),
  serviceUnavailable:  (res, err, msg = 'Service Unavailable')      => build(res, 503, 'error',   msg, err),
};