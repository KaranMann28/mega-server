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
      // AI roles
      'ai engineer',
      'ai',
      'machine learning',
      'ml engineer',
      'artificial intelligence',
      // Sales Engineering
      'sales engineer',
      'sales engineering',
      // Solutions Engineering  
      'solutions engineer',
      'solutions engineering',
      'solution engineer',
      'solutions architect',
      'solution architect',
      // Pre-sales
      'presales',
      'pre-sales',
      'presales engineer',
      'pre-sales engineer',
      // Technical Sales
      'technical sales',
      'sales consultant',
      'technical account',
      // Customer Engineering
      'customer engineer',
      'customer success engineer',
      'field engineer',
    ],
    // Include jobs with these location keywords (empty = all locations)
    locations: [],
    // Exclude jobs with these keywords (empty = no exclusions, all XP levels welcome)
    exclude: [],
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
    maxBatchSize: 10,
    // Delay between posts in ms
    postDelay: 2000,
  },
};
