/**
 * Wellfound (AngelList) Job Scraper
 * 
 * Scrapes startup job postings from wellfound.com
 */

const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../utils/logger');

const BASE_URL = 'https://wellfound.com';
const JOBS_URL = `${BASE_URL}/jobs`;

/**
 * Build search URL with filters
 * @returns {string} Search URL
 */
function buildSearchUrl() {
  const { roles, locations } = config.filters;
  
  // Build query params
  const params = new URLSearchParams();
  
  // Add role filter if configured
  if (roles.length > 0) {
    params.set('q', roles[0]); // Use first role as search term
  }
  
  // Add remote filter if remote is in locations
  if (locations.some(loc => loc.toLowerCase() === 'remote')) {
    params.set('remote', 'true');
  }

  const queryString = params.toString();
  return queryString ? `${JOBS_URL}?${queryString}` : JOBS_URL;
}

/**
 * Scrape jobs from Wellfound
 * @returns {Array} Array of job objects
 */
async function scrapeJobs() {
  const url = buildSearchUrl();
  const jobs = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      logger.warn(`Wellfound: Could not fetch jobs (${response.status})`);
      return jobs;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Wellfound job cards
    $('[data-test="StartupResult"]').each((_, element) => {
      const $card = $(element);
      
      // Company info
      const company = $card.find('[data-test="StartupResult-name"]').text().trim();
      const companyUrl = $card.find('a[href*="/company/"]').attr('href');
      
      // Job listings within the company card
      $card.find('[data-test="JobListing"]').each((_, jobEl) => {
        const $job = $(jobEl);
        
        const title = $job.find('[data-test="JobListing-title"]').text().trim();
        const jobUrl = $job.find('a').attr('href');
        const location = $job.find('[data-test="JobListing-location"]').text().trim();
        const salary = $job.find('[data-test="JobListing-salary"]').text().trim();
        const equity = $job.find('[data-test="JobListing-equity"]').text().trim();

        if (title && jobUrl) {
          // Extract job ID from URL
          const jobId = jobUrl.split('/').pop() || `${company}-${title}`.replace(/\s+/g, '-');

          jobs.push({
            id: `wellfound-${jobId}`,
            title,
            company: company || 'Startup',
            location: location || 'Not specified',
            salary: salary || null,
            equity: equity || null,
            url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
            source: 'Wellfound',
            scrapedAt: new Date().toISOString(),
          });
        }
      });
    });

    // Alternative selector for different page structure
    if (jobs.length === 0) {
      $('div[class*="job-listing"], div[class*="JobCard"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h2, h3, [class*="title"]').first().text().trim();
        const company = $el.find('[class*="company"]').text().trim();
        const $link = $el.find('a[href*="/jobs/"], a[href*="/role/"]').first();
        const jobUrl = $link.attr('href');
        const location = $el.find('[class*="location"]').text().trim();

        if (title && jobUrl) {
          const jobId = jobUrl.split('/').pop() || Date.now();
          jobs.push({
            id: `wellfound-${jobId}`,
            title,
            company: company || 'Startup',
            location: location || 'Not specified',
            url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
            source: 'Wellfound',
            scrapedAt: new Date().toISOString(),
          });
        }
      });
    }

    logger.debug(`Wellfound: Found ${jobs.length} jobs`);
  } catch (error) {
    logger.error('Wellfound: Error scraping:', error.message);
  }

  return jobs;
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
 * Main scrape function
 * @returns {Array} Array of filtered job objects
 */
async function scrape() {
  logger.info('Wellfound: Scraping startup jobs...');

  const allJobs = await scrapeJobs();
  const filteredJobs = filterJobs(allJobs);

  logger.info(`Wellfound: Found ${filteredJobs.length} matching jobs (${allJobs.length} total)`);

  return filteredJobs;
}

module.exports = {
  scrape,
  scrapeJobs,
  filterJobs,
};

