'use strict';

/**
 * Unified HTTP response builder.
 *
 * Provides a consistent response envelope shape across all routes:
 *   { success: boolean, message: string, data: any | null }
 *
 * All controllers and middlewares should use this class instead of
 * calling res.json() / res.status() directly.
 */
class ApiResponse {
  /** 200 OK */
  static success(res, data, message = 'Success') {
    return res.status(200).json({ success: true, message, data: data ?? null });
  }

  /** 201 Created */
  static created(res, data, message = 'Created') {
    return res.status(201).json({ success: true, message, data: data ?? null });
  }

  /** 202 Accepted */
  static accepted(res, data, message = 'Accepted') {
    return res.status(202).json({ success: true, message, data: data ?? null });
  }

  /** 204 No Content */
  static noContent(res) {
    return res.status(204).end();
  }

  /** 400 Bad Request */
  static badRequest(res, data, message = 'Bad request') {
    return res.status(400).json({ success: false, message, data: data ?? null });
  }

  /** 401 Unauthorized */
  static unauthorized(res, data, message = 'Unauthorized') {
    return res.status(401).json({ success: false, message, data: data ?? null });
  }

  /** 403 Forbidden */
  static forbidden(res, data, message = 'Forbidden') {
    return res.status(403).json({ success: false, message, data: data ?? null });
  }

  /** 404 Not Found */
  static notFound(res, data, message = 'Not found') {
    return res.status(404).json({ success: false, message, data: data ?? null });
  }

  /** 409 Conflict */
  static conflict(res, data, message = 'Conflict') {
    return res.status(409).json({ success: false, message, data: data ?? null });
  }

  /** 422 Unprocessable Entity */
  static unprocessableEntity(res, data, message = 'Validation failed') {
    return res.status(422).json({ success: false, message, data: data ?? null });
  }

  /** 500 Internal Server Error */
  static internalError(res, data, message = 'An unexpected error occurred') {
    return res.status(500).json({ success: false, message, data: data ?? null });
  }

  /**
   * Resolves the correct HTTP response from an AppException or unknown error.
   * Used exclusively by global error-handling middleware.
   *
   * - Operational errors (AppException with isOperational=true): use err.statusCode + err.message
   * - Unknown/programming errors: always 500 with a generic message
   *
   * @param {import('express').Response} res
   * @param {Error & { statusCode?: number; code?: string; isOperational?: boolean }} err
   */
  static fromError(res, err) {
    const statusCode = err.statusCode || 500;
    const isOperational = Boolean(err.isOperational);
    const message = isOperational ? err.message : 'An unexpected error occurred';
    const code = err.code || 'INTERNAL_ERROR';

    return res.status(statusCode).json({ success: false, code, message });
  }
}

module.exports = ApiResponse;
