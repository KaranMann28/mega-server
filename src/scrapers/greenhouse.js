/**
 * Greenhouse Job Board Scraper
 * 
 * Uses Greenhouse's JSON API to fetch job postings
 */

const config = require('../config');
const logger = require('../utils/logger');

const API_URL = 'https://boards-api.greenhouse.io/v1/boards';

/**
 * Fetch jobs from a Greenhouse company via API
 * @param {string} company - Company slug (e.g., 'airbnb', 'stripe')
 * @returns {Array} Array of job objects
 */
async function scrapeCompany(company) {
  const url = `${API_URL}/${company}/jobs`;
  const jobs = [];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(`Greenhouse: Could not fetch ${company} (${response.status})`);
      return jobs;
    }

    const data = await response.json();
    const jobList = data.jobs || [];

    for (const job of jobList) {
      jobs.push({
        id: `greenhouse-${company}-${job.id}`,
        title: job.title || 'Unknown Title',
        company: formatCompanyName(company),
        location: job.location?.name || 'Not specified',
        department: job.departments?.[0]?.name || null,
        url: job.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${job.id}`,
        source: 'Greenhouse',
        scrapedAt: new Date().toISOString(),
      });
    }

    logger.debug(`Greenhouse: Found ${jobs.length} jobs at ${company}`);
  } catch (error) {
    logger.error(`Greenhouse: Error scraping ${company}:`, error.message);
  }

  return jobs;
}

/**
 * Format company slug to proper name
 * @param {string} slug - Company slug
 * @returns {string} Formatted company name
 */
function formatCompanyName(slug) {
  const nameMap = {
    // Enterprise / Public
    'datadog': 'Datadog',
    'cloudflare': 'Cloudflare',
    'twilio': 'Twilio',
    'mongodb': 'MongoDB',
    'okta': 'Okta',
    'pagerduty': 'PagerDuty',
    'zscaler': 'Zscaler',
    'gitlab': 'GitLab',
    // Fintech
    'stripe': 'Stripe',
    'affirm': 'Affirm',
    'robinhood': 'Robinhood',
    'mercury': 'Mercury',
    'block': 'Block',
    // Consumer / Marketplace
    'airbnb': 'Airbnb',
    'instacart': 'Instacart',
    'lyft': 'Lyft',
    'duolingo': 'Duolingo',
    'reddit': 'Reddit',
    'toast': 'Toast',
    // Productivity
    'airtable': 'Airtable',
    'gusto': 'Gusto',
    'figma': 'Figma',
    'flexport': 'Flexport',
    // Hardware / Autonomous
    'waymo': 'Waymo',
    'nuro': 'Nuro',
    'samsara': 'Samsara',
    'verkada': 'Verkada',
    // AI / Data
    'databricks': 'Databricks',
  };
  return nameMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * Filter jobs based on config filters
 * @param {Array} jobs - Array of job objects
 * @returns {Array} Filtered jobs
 */
function filterJobs(jobs) {
  const { roles, locations, exclude } = config.filters;

  return jobs.filter(job => {
    const titleLower = job.title.toLowerCase();
    const locationLower = (job.location || '').toLowerCase();

    // Check if job matches any role filter
    const matchesRole = roles.length === 0 || 
      roles.some(role => titleLower.includes(role.toLowerCase()));

    // Check if job matches any location filter
    const matchesLocation = locations.length === 0 ||
      locations.some(loc => locationLower.includes(loc.toLowerCase()));

    // Check if job should be excluded
    const shouldExclude = exclude.some(term => 
      titleLower.includes(term.toLowerCase())
    );

    return matchesRole && matchesLocation && !shouldExclude;
  });
}

/**
 * Scrape all configured Greenhouse companies
 * @returns {Array} Array of job objects from all companies
 */
async function scrape() {
  const companies = config.companies.greenhouse || [];
  
  if (companies.length === 0) {
    logger.debug('Greenhouse: No companies configured');
    return [];
  }

  logger.info(`Greenhouse: Scraping ${companies.length} companies...`);

  // Scrape all companies in parallel
  const results = await Promise.all(
    companies.map(company => scrapeCompany(company))
  );

  // Flatten results and filter
  const allJobs = results.flat();
  const filteredJobs = filterJobs(allJobs);

  logger.info(`Greenhouse: Found ${filteredJobs.length} matching jobs (${allJobs.length} total)`);

  return filteredJobs;
}

module.exports = {
  scrape,
  scrapeCompany,
  filterJobs,
};
