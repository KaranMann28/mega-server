/**
 * Greenhouse Job Board Scraper
 * 
 * Scrapes job postings from boards.greenhouse.io for configured companies
 */

const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../utils/logger');

const BASE_URL = 'https://boards.greenhouse.io';

/**
 * Fetch and parse jobs from a Greenhouse company page
 * @param {string} company - Company slug (e.g., 'airbnb', 'coinbase')
 * @returns {Array} Array of job objects
 */
async function scrapeCompany(company) {
  const url = `${BASE_URL}/${company}`;
  const jobs = [];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(`Greenhouse: Could not fetch ${company} (${response.status})`);
      return jobs;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Greenhouse uses sections for departments
    $('section.level-0').each((_, section) => {
      const $section = $(section);
      const department = $section.find('h2').text().trim();

      // Find all job openings in this section
      $section.find('.opening').each((_, opening) => {
        const $opening = $(opening);
        
        const $link = $opening.find('a');
        const title = $link.text().trim();
        const jobUrl = $link.attr('href');
        const location = $opening.find('.location').text().trim();

        if (title && jobUrl) {
          // Extract job ID from URL
          const jobId = jobUrl.split('/').pop().split('?')[0];

          jobs.push({
            id: `greenhouse-${company}-${jobId}`,
            title,
            company: formatCompanyName(company),
            location: location || 'Not specified',
            department: department || null,
            url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
            source: 'Greenhouse',
            scrapedAt: new Date().toISOString(),
          });
        }
      });
    });

    // Alternative structure - some boards use different markup
    if (jobs.length === 0) {
      $('div[class*="opening"]').each((_, element) => {
        const $el = $(element);
        const $link = $el.find('a').first();
        const title = $link.text().trim();
        const jobUrl = $link.attr('href');
        const location = $el.find('[class*="location"]').text().trim();

        if (title && jobUrl) {
          const jobId = jobUrl.split('/').pop().split('?')[0];
          jobs.push({
            id: `greenhouse-${company}-${jobId}`,
            title,
            company: formatCompanyName(company),
            location: location || 'Not specified',
            url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
            source: 'Greenhouse',
            scrapedAt: new Date().toISOString(),
          });
        }
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
    'airbnb': 'Airbnb',
    'coinbase': 'Coinbase',
    'datadog': 'Datadog',
    'twitch': 'Twitch',
    'plaid': 'Plaid',
    'airtable': 'Airtable',
    'duolingo': 'Duolingo',
    'instacart': 'Instacart',
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

