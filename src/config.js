/**
 * Mega Server Career Bot Configuration
 * 
 * Add companies you want to track and filter settings here.
 */

module.exports = {
  // Companies to track on each job board
  // Use the exact slug from the company's career page URL
  companies: {
    // Lever: jobs.lever.co/[company]
    lever: [
      'reddit',
      'cloudflare',
      'discord',
      'spotify',
      'twilio',
      'netlify',
      'postman',
      'webflow',
    ],
    // Greenhouse: boards.greenhouse.io/[company]  
    greenhouse: [
      'airbnb',
      'datadog',
      'duolingo',
      'instacart',
      'twitch',
      'gusto',
      'chime',
      'nerdwallet',
    ],
  },

  // Filter jobs by these keywords (case-insensitive)
  filters: {
    // Include jobs with these role keywords
    roles: [
      'engineer',
      'architect',
      'developer',
      'sales',
      'solutions',
      'technical',
      'ai',
      'ml',
      'data',
      'platform',
      'backend',
      'frontend',
      'fullstack',
      'devops',
      'sre',
    ],
    // Include jobs with these location keywords (empty = all locations)
    locations: [],
    // Exclude jobs with these keywords
    exclude: [
      'intern',
      'internship',
      'junior',
      'associate',
      'entry level',
      'co-op',
      'apprentice',
    ],
  },

  // Scraping intervals (in cron format)
  schedule: {
    // Check for new jobs every hour
    jobCheck: '0 * * * *',
    // LinkedIn email check every 30 minutes
    emailCheck: '*/30 * * * *',
  },

  // Message formatting
  formatting: {
    // Max jobs to post in a single batch (to avoid rate limits)
    maxBatchSize: 5,
    // Delay between posts in ms
    postDelay: 2000,
  },
};
