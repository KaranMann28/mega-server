/**
 * Job Deduplication Service
 * 
 * Uses JSON file to track seen jobs and avoid duplicate posts
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Database path
const DB_PATH = path.join(__dirname, '../../data/jobs.json');

// In-memory cache
let seenJobs = {};

/**
 * Initialize - load existing data
 */
function init() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      seenJobs = JSON.parse(data);
      
      // Clean up old entries
      cleanOldEntries();
    } else {
      seenJobs = {};
      save();
    }
    
    const count = Object.keys(seenJobs).length;
    logger.info(`Dedup: Loaded ${count} tracked jobs`);
  } catch (error) {
    logger.error('Dedup: Failed to initialize:', error.message);
    seenJobs = {};
  }
}

/**
 * Save to disk
 */
function save() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(seenJobs, null, 2));
  } catch (error) {
    logger.error('Dedup: Failed to save:', error.message);
  }
}

/**
 * Check if a job has been seen before
 * @param {string} jobId - Unique job identifier
 * @returns {boolean} True if job has been seen
 */
function hasSeenJob(jobId) {
  return !!seenJobs[jobId];
}

/**
 * Mark a job as seen
 * @param {string} jobId - Unique job identifier
 * @param {Object} job - Job details to store
 */
function markJobSeen(jobId, job = {}) {
  const now = new Date().toISOString();
  
  seenJobs[jobId] = {
    id: jobId,
    title: job.title || null,
    company: job.company || null,
    url: job.url || null,
    source: job.source || null,
    firstSeen: seenJobs[jobId]?.firstSeen || now,
    lastSeen: now,
  };
  
  save();
  logger.debug(`Dedup: Marked job ${jobId} as seen`);
}

/**
 * Get all seen job IDs
 * @returns {Array} Array of job IDs
 */
function getAllSeenJobIds() {
  return Object.keys(seenJobs);
}

/**
 * Get job details by ID
 * @param {string} jobId - Job identifier
 * @returns {Object|null} Job details or null
 */
function getJob(jobId) {
  return seenJobs[jobId] || null;
}

/**
 * Clean up entries older than 30 days
 */
function cleanOldEntries() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString();
  
  let removed = 0;
  Object.keys(seenJobs).forEach(id => {
    if (seenJobs[id].firstSeen < cutoff) {
      delete seenJobs[id];
      removed++;
    }
  });
  
  if (removed > 0) {
    save();
    logger.info(`Dedup: Cleaned up ${removed} old job entries`);
  }
}

/**
 * Get statistics about tracked jobs
 * @returns {Object} Statistics
 */
function getStats() {
  const bySource = {};
  
  Object.values(seenJobs).forEach(job => {
    const source = job.source || 'Unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  });
  
  return {
    total: Object.keys(seenJobs).length,
    bySource,
  };
}

/**
 * Close - save to disk
 */
function close() {
  save();
  logger.info('Dedup: Data saved');
}

module.exports = {
  init,
  hasSeenJob,
  markJobSeen,
  getAllSeenJobIds,
  getJob,
  cleanOldEntries,
  getStats,
  close,
};
