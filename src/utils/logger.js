/**
 * Simple logger utility with timestamps and levels
 */

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = process.env.LOG_LEVEL || 'info';

function formatDate() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (levels[level] <= levels[currentLevel]) {
    const prefix = `[${formatDate()}] [${level.toUpperCase()}]`;
    console.log(prefix, ...args);
  }
}

module.exports = {
  error: (...args) => log('error', ...args),
  warn: (...args) => log('warn', ...args),
  info: (...args) => log('info', ...args),
  debug: (...args) => log('debug', ...args),
};

