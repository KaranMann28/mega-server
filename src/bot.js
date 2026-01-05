/**
 * Mega Server Career Bot
 * 
 * Discord bot that aggregates job postings from multiple sources
 * and posts them to your career channel.
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Events } = require('discord.js');
const cron = require('node-cron');
const config = require('./config');
const logger = require('./utils/logger');
const { formatJobText } = require('./services/formatter');
const dedup = require('./services/dedup');
const scheduler = require('./services/scheduler');

// Import scrapers
const leverScraper = require('./scrapers/lever');
const greenhouseScraper = require('./scrapers/greenhouse');
const wellfoundScraper = require('./scrapers/wellfound');
const ycScraper = require('./scrapers/ycombinator');
const linkedinParser = require('./scrapers/linkedin');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Store reference to career channel
let careerChannel = null;

/**
 * Post a job to Discord
 * @param {Object} job - Job object
 */
async function postJob(job) {
  if (!careerChannel) {
    logger.error('Career channel not found');
    return;
  }

  try {
    const message = formatJobText(job);
    await careerChannel.send(message);
    logger.info(`Posted job: ${job.title} at ${job.company}`);
  } catch (error) {
    logger.error('Failed to post job:', error.message);
  }
}

/**
 * Post multiple jobs with rate limiting
 * @param {Array} jobs - Array of job objects
 */
async function postJobs(jobs) {
  const { maxBatchSize, postDelay } = config.formatting;
  const batch = jobs.slice(0, maxBatchSize);

  for (const job of batch) {
    await postJob(job);
    // Delay between posts to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, postDelay));
  }

  if (jobs.length > maxBatchSize) {
    logger.info(`${jobs.length - maxBatchSize} more jobs queued for next batch`);
  }
}

/**
 * Run all scrapers and post new jobs
 */
async function checkForNewJobs() {
  logger.info('Checking for new jobs...');

  const allJobs = [];

  // Run all scrapers in parallel
  try {
    const results = await Promise.allSettled([
      leverScraper.scrape(),
      greenhouseScraper.scrape(),
      wellfoundScraper.scrape(),
      ycScraper.scrape(),
    ]);

    results.forEach((result, index) => {
      const scraperNames = ['Lever', 'Greenhouse', 'Wellfound', 'Y Combinator'];
      if (result.status === 'fulfilled') {
        logger.info(`${scraperNames[index]}: Found ${result.value.length} jobs`);
        allJobs.push(...result.value);
      } else {
        logger.error(`${scraperNames[index]} scraper failed:`, result.reason?.message);
      }
    });
  } catch (error) {
    logger.error('Error running scrapers:', error.message);
  }

  // Filter out duplicates
  const newJobs = allJobs.filter(job => !dedup.hasSeenJob(job.id));

  if (newJobs.length > 0) {
    logger.info(`Found ${newJobs.length} new jobs to post`);
    
    // Mark jobs as seen
    newJobs.forEach(job => dedup.markJobSeen(job.id, job));
    
    // Post to Discord
    await postJobs(newJobs);
  } else {
    logger.info('No new jobs found');
  }
}

/**
 * Check LinkedIn emails for job alerts
 */
async function checkLinkedInEmails() {
  logger.info('Checking LinkedIn emails...');

  try {
    const jobs = await linkedinParser.parse();
    const newJobs = jobs.filter(job => !dedup.hasSeenJob(job.id));

    if (newJobs.length > 0) {
      logger.info(`Found ${newJobs.length} new LinkedIn jobs`);
      newJobs.forEach(job => dedup.markJobSeen(job.id, job));
      await postJobs(newJobs);
    }
  } catch (error) {
    logger.error('Error checking LinkedIn emails:', error.message);
  }
}

// Bot ready event
client.once(Events.ClientReady, async (c) => {
  logger.info(`Bot logged in as ${c.user.tag}`);

  // Get career channel
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (channelId) {
    careerChannel = await client.channels.fetch(channelId);
    if (careerChannel) {
      logger.info(`Connected to channel: #${careerChannel.name}`);
    } else {
      logger.error(`Could not find channel with ID: ${channelId}`);
    }
  } else {
    logger.error('DISCORD_CHANNEL_ID not set in environment');
  }

  // Initialize database
  dedup.init();

  // Schedule job checks
  scheduler.start({
    jobCheck: checkForNewJobs,
    emailCheck: checkLinkedInEmails,
  });

  // Run initial check
  logger.info('Running initial job check...');
  await checkForNewJobs();
});

// Error handling
client.on(Events.Error, (error) => {
  logger.error('Discord client error:', error.message);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error.message);
});

// Start bot
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  logger.error('DISCORD_BOT_TOKEN not set in environment');
  process.exit(1);
}

logger.info('Starting Mega Server Career Bot...');
client.login(token);

