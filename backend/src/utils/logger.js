/**
 * Custom Logging Middleware
 * 
 * AffordMed Campus Hiring Evaluation
 * This is the mandatory logging middleware that must be used
 * throughout the entire codebase.
 * 
 * Usage:
 *   const logger = require("./utils/logger");
 *   logger.info("message");
 *   logger.error("something failed", errorObj);
 *   logger.middleware()  -- returns Express middleware
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LOG_LEVELS.DEBUG;

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, meta = {}) {
  const base = `[${formatTimestamp()}] [${level}]`;
  const metaStr = Object.keys(meta).length > 0
    ? " " + JSON.stringify(meta)
    : "";
  return `${base} ${message}${metaStr}`;
}

const logger = {
  debug(message, meta) {
    if (currentLevel <= LOG_LEVELS.DEBUG)
      process.stdout.write(formatMessage("DEBUG", message, meta) + "\n");
  },

  info(message, meta) {
    if (currentLevel <= LOG_LEVELS.INFO)
      process.stdout.write(formatMessage("INFO", message, meta) + "\n");
  },

  warn(message, meta) {
    if (currentLevel <= LOG_LEVELS.WARN)
      process.stderr.write(formatMessage("WARN", message, meta) + "\n");
  },

  error(message, meta) {
    if (currentLevel <= LOG_LEVELS.ERROR)
      process.stderr.write(formatMessage("ERROR", message, meta) + "\n");
  },

  // Express middleware — logs every HTTP request
  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} → ${res.statusCode}`, {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration_ms: duration,
        });
      });

      next();
    };
  },
};

module.exports = logger;
