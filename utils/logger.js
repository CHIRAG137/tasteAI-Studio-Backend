function getTimeStamp() {
  return new Date().toISOString();
}

function logger(level, message, meta = null) {
  const entry = {
    time: getTimeStamp(),
    level: level.toUpperCase(),
    message,
    ...(meta ? { meta } : {}),
  };

  console.log(JSON.stringify(entry));
}

exports.info = (message, meta) => logger("info", message, meta);
exports.warn = (message, meta) => logger("warn", message, meta);
exports.error = (message, meta) => logger("error", message, meta);
exports.debug = (message, meta) => logger("debug", message, meta);
