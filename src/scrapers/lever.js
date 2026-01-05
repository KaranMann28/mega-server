/**
 * Lever Job Board Scraper
 * 
 * Uses Lever's JSON API to fetch job postings
 */

const config = require('../config');
const logger = require('../utils/logger');

const API_URL = 'https://api.lever.co/v0/postings';

/**
 * Fetch jobs from a Lever company via API
 * @param {string} company - Company slug (e.g., 'spotify', 'openai')
 * @returns {Array} Array of job objects
 */
async function scrapeCompany(company) {
  const url = `${API_URL}/${company}?mode=json`;
  const jobs = [];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(`Lever: Could not fetch ${company} (${response.status})`);
      return jobs;
    }

    const data = await response.json();
    
    for (const job of data) {
      jobs.push({
        id: `lever-${company}-${job.id}`,
        title: job.text || 'Unknown Title',
        company: formatCompanyName(company),
        location: job.categories?.location || 'Not specified',
        team: job.categories?.team || null,
        commitment: job.categories?.commitment || null,
        url: job.hostedUrl || job.applyUrl || `https://jobs.lever.co/${company}/${job.id}`,
        source: 'Lever',
        scrapedAt: new Date().toISOString(),
      });
    }

    logger.debug(`Lever: Found ${jobs.length} jobs at ${company}`);
  } catch (error) {
    logger.error(`Lever: Error scraping ${company}:`, error.message);
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
    'spotify': 'Spotify',
    'palantir': 'Palantir',
    'clari': 'Clari',
    'outreach': 'Outreach',
    'highspot': 'Highspot',
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
 * Scrape all configured Lever companies
 * @returns {Array} Array of job objects from all companies
 */
async function scrape() {
  const companies = config.companies.lever || [];
  
  if (companies.length === 0) {
    logger.debug('Lever: No companies configured');
    return [];
  }

  logger.info(`Lever: Scraping ${companies.length} companies...`);

  // Scrape all companies in parallel
  const results = await Promise.all(
    companies.map(company => scrapeCompany(company))
  );

  // Flatten results and filter
  const allJobs = results.flat();
  const filteredJobs = filterJobs(allJobs);

  logger.info(`Lever: Found ${filteredJobs.length} matching jobs (${allJobs.length} total)`);

  return filteredJobs;
}

module.exports = {
  scrape,
  scrapeCompany,
  filterJobs,
};
