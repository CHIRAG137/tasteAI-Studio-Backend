const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "app.log");

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

  const line = JSON.stringify(entry);
  console.log(line);
  fs.appendFileSync(logFile, line + "\n");
}

exports.info = (message, meta) => logger("info", message, meta);
exports.warn = (message, meta) => logger("warn", message, meta);
exports.error = (message, meta) => logger("error", message, meta);
exports.debug = (message, meta) => logger("debug", message, meta);
