/**
 * Lever Job Board Scraper
 * 
 * Scrapes job postings from jobs.lever.co for configured companies
 */

const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../utils/logger');

const BASE_URL = 'https://jobs.lever.co';

/**
 * Fetch and parse jobs from a Lever company page
 * @param {string} company - Company slug (e.g., 'stripe', 'openai')
 * @returns {Array} Array of job objects
 */
async function scrapeCompany(company) {
  const url = `${BASE_URL}/${company}`;
  const jobs = [];

  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.warn(`Lever: Could not fetch ${company} (${response.status})`);
      return jobs;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Lever uses a specific structure for job listings
    $('.posting').each((_, element) => {
      const $posting = $(element);
      
      const title = $posting.find('.posting-title h5').text().trim();
      const location = $posting.find('.posting-categories .location').text().trim();
      const team = $posting.find('.posting-categories .department').text().trim();
      const commitment = $posting.find('.posting-categories .commitment').text().trim();
      const jobUrl = $posting.find('a.posting-title').attr('href');

      if (title && jobUrl) {
        // Extract job ID from URL
        const jobId = jobUrl.split('/').pop();

        jobs.push({
          id: `lever-${company}-${jobId}`,
          title,
          company: formatCompanyName(company),
          location: location || 'Not specified',
          team: team || null,
          commitment: commitment || null,
          url: jobUrl,
          source: 'Lever',
          scrapedAt: new Date().toISOString(),
        });
      }
    });

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
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'figma': 'Figma',
    'notion': 'Notion',
    'stripe': 'Stripe',
    'vercel': 'Vercel',
    'linear': 'Linear',
    'retool': 'Retool',
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

