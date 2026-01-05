/**
 * Job Scheduler Service
 * 
 * Uses node-cron to schedule periodic job checks
 */

const cron = require('node-cron');
const config = require('../config');
const logger = require('../utils/logger');

// Store scheduled tasks
const tasks = {};

/**
 * Start scheduled tasks
 * @param {Object} handlers - Task handlers
 * @param {Function} handlers.jobCheck - Handler for job board scraping
 * @param {Function} handlers.emailCheck - Handler for email parsing
 */
function start(handlers) {
  const { jobCheck, emailCheck } = config.schedule;
  
  // Schedule job board scraping
  if (handlers.jobCheck && jobCheck) {
    if (cron.validate(jobCheck)) {
      tasks.jobCheck = cron.schedule(jobCheck, async () => {
        logger.info('Scheduler: Running scheduled job check');
        try {
          await handlers.jobCheck();
        } catch (error) {
          logger.error('Scheduler: Job check failed:', error.message);
        }
      });
      logger.info(`Scheduler: Job check scheduled (${jobCheck})`);
    } else {
      logger.error(`Scheduler: Invalid cron expression for jobCheck: ${jobCheck}`);
    }
  }
  
  // Schedule email parsing
  if (handlers.emailCheck && emailCheck) {
    if (cron.validate(emailCheck)) {
      tasks.emailCheck = cron.schedule(emailCheck, async () => {
        logger.info('Scheduler: Running scheduled email check');
        try {
          await handlers.emailCheck();
        } catch (error) {
          logger.error('Scheduler: Email check failed:', error.message);
        }
      });
      logger.info(`Scheduler: Email check scheduled (${emailCheck})`);
    } else {
      logger.error(`Scheduler: Invalid cron expression for emailCheck: ${emailCheck}`);
    }
  }
  
  logger.info('Scheduler: All tasks started');
}

/**
 * Stop all scheduled tasks
 */
function stop() {
  Object.keys(tasks).forEach(name => {
    if (tasks[name]) {
      tasks[name].stop();
      logger.info(`Scheduler: Stopped ${name}`);
    }
  });
  logger.info('Scheduler: All tasks stopped');
}

/**
 * Get status of scheduled tasks
 * @returns {Object} Task status
 */
function getStatus() {
  const status = {};
  
  Object.keys(tasks).forEach(name => {
    status[name] = {
      running: tasks[name]?.running || false,
    };
  });
  
  return status;
}

/**
 * Manually trigger a task
 * @param {string} taskName - Name of task to trigger
 * @param {Function} handler - Task handler
 */
async function trigger(taskName, handler) {
  logger.info(`Scheduler: Manually triggering ${taskName}`);
  try {
    await handler();
  } catch (error) {
    logger.error(`Scheduler: ${taskName} failed:`, error.message);
    throw error;
  }
}

/**
 * Parse cron expression to human-readable format
 * @param {string} expression - Cron expression
 * @returns {string} Human-readable description
 */
function describeCron(expression) {
  const descriptions = {
    '0 * * * *': 'Every hour',
    '*/30 * * * *': 'Every 30 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '0 */2 * * *': 'Every 2 hours',
    '0 9 * * *': 'Daily at 9 AM',
    '0 9 * * 1-5': 'Weekdays at 9 AM',
  };
  
  return descriptions[expression] || expression;
}

module.exports = {
  start,
  stop,
  getStatus,
  trigger,
  describeCron,
};

