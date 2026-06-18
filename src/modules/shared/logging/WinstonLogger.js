'use strict';

const winston = require('winston');
const ILogger = require('./ILogger');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

/** Human-readable coloured format for local development */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}${stackStr}`;
  }),
);

/** Structured JSON format for production log aggregation (Datadog, CloudWatch, etc.) */
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Concrete logger implementation backed by Winston.
 * - Development: coloured pretty-print with timestamps
 * - Production: structured JSON, suitable for log aggregation pipelines
 *
 * Implements ILogger to allow easy swap-out in tests.
 */
class WinstonLogger extends ILogger {
  constructor() {
    super();

    const isProduction = process.env.NODE_ENV === 'production';

    this._logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      format: isProduction ? prodFormat : devFormat,
      transports: [new winston.transports.Console()],
      exitOnError: false,
    });
  }

  debug(message, meta = {}) {
    this._logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this._logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this._logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this._logger.error(message, meta);
  }
}

module.exports = WinstonLogger;
