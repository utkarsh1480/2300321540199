// Simple logging utility as required for assessment
const writeLog = (level, msg, data) => {
  const time = new Date().toISOString();
  const extra = data ? ' ' + JSON.stringify(data) : '';
  const output = `[${time}] [${level}] ${msg}${extra}\n`;
  if (level === 'ERROR' || level === 'WARN') {
    process.stderr.write(output);
  } else {
    process.stdout.write(output);
  }
};

const logger = {
  info: (msg, data) => writeLog('INFO', msg, data),
  debug: (msg, data) => writeLog('DEBUG', msg, data),
  warn: (msg, data) => writeLog('WARN', msg, data),
  error: (msg, data) => writeLog('ERROR', msg, data),
  
  middleware: () => {
    return (req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const ms = Date.now() - start;
        writeLog('INFO', `${req.method} ${req.originalUrl} - ${res.statusCode} (${ms}ms)`);
      });
      next();
    };
  }
};

module.exports = logger;
