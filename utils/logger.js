'use strict';

/**
 * Minimal structured JSON logger.
 */

function getTimestamp() {
  return new Date().toISOString();
}

function formatLog(level, message, meta) {
  return JSON.stringify({
    time: getTimestamp(),
    level: level.toUpperCase(),
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  });
}

function log(level, message, meta = {}) {
  const line = formatLog(level, message, meta);
  if (level === 'error') {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
}

module.exports = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
