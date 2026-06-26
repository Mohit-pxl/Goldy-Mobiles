const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'goldy-mobiles-api' },
  transports: [
    // Console transport — always active
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        consoleFormat
      ),
    }),

    // File transport — error level only
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(json()),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),

    // File transport — all levels
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(json()),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
  // Don't exit on uncaught exceptions — let the process handler deal with it
  exitOnError: false,
});

// Create a stream object for use with Morgan or Express request logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
