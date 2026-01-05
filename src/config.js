/**
 * Mega Server Career Bot Configuration
 * 
 * Curated list of tech companies across all stages:
 * - Enterprise: Large public tech companies
 * - Pre-IPO/Unicorn: Late-stage private companies
 * - Growth: Series B-D companies
 * - Startup: Early-stage/YC companies
 */

module.exports = {
  // Companies to track on each job board
  // Use the exact slug from the company's career page URL
  companies: {
    // Lever: jobs.lever.co/[company]
    lever: [
      // Enterprise / Late Stage
      'spotify',
      'palantir',
      // Sales Tech
      'clari',
      'outreach',
      'highspot',
    ],
    // Greenhouse: boards.greenhouse.io/[company]  
    greenhouse: [
      // Enterprise / Public
      'datadog',
      'cloudflare',
      'twilio',
      'mongodb',
      'okta',
      'pagerduty',
      'zscaler',
      'gitlab',
      // Fintech
      'stripe',
      'affirm',
      'robinhood',
      'mercury',
      'block',
      // Consumer / Marketplace
      'airbnb',
      'instacart',
      'lyft',
      'duolingo',
      'reddit',
      'toast',
      // Productivity
      'airtable',
      'gusto',
      'figma',
      'flexport',
      // Hardware / Autonomous
      'waymo',
      'nuro',
      'samsara',
      'verkada',
      // AI / Data
      'databricks',
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
    locations: [
      // Remote
      'remote', 'anywhere', 'distributed', 'work from home',
      // USA general
      'united states', 'usa', 'us,', 'u.s.',
      // USA cities
      'new york', 'nyc', 'san francisco', 'sf', 'bay area', 
      'los angeles', 'la', 'seattle', 'austin', 'boston', 
      'chicago', 'denver', 'miami', 'atlanta', 'washington dc',
      'san diego', 'portland', 'philadelphia', 'dallas', 'houston',
      'phoenix', 'minneapolis', 'detroit', 'san jose', 'palo alto',
      'mountain view', 'sunnyvale', 'menlo park', 'redwood city',
      // Canada general
      'canada', 'canadian',
      // Canada cities
      'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 
      'edmonton', 'waterloo', 'kitchener',
    ],
    // Exclude jobs with these keywords (empty = no exclusions, all XP levels welcome)
    exclude: [],
  },

  // Scraping intervals (in cron format)
  schedule: {
    // Check for new jobs every hour
    jobCheck: '0 * * * *',
    // LinkedIn emails handled by n8n workflow - disabled here
    emailCheck: null,
  },

  // Message formatting
  formatting: {
    // Max jobs to post in a single batch (to avoid rate limits)
    maxBatchSize: 10,
    // Delay between posts in ms
    postDelay: 2000,
  },
};
