/**
 * Y Combinator Jobs Scraper
 * 
 * Scrapes job postings from workatastartup.com (YC's job board)
 */

const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../utils/logger');

const BASE_URL = 'https://www.workatastartup.com';
const JOBS_URL = `${BASE_URL}/jobs`;

/**
 * Build search URL with filters
 * @returns {string} Search URL
 */
function buildSearchUrl() {
  const { roles, locations } = config.filters;
  
  const params = new URLSearchParams();
  
  // Add role/query filter
  if (roles.length > 0) {
    params.set('query', roles.join(' OR '));
  }
  
  // Add remote filter
  if (locations.some(loc => loc.toLowerCase() === 'remote')) {
    params.set('hasRemote', 'true');
  }

  const queryString = params.toString();
  return queryString ? `${JOBS_URL}?${queryString}` : JOBS_URL;
}

/**
 * Scrape jobs from YC's Work at a Startup
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
      logger.warn(`Y Combinator: Could not fetch jobs (${response.status})`);
      return jobs;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // YC job listings
    $('[class*="JobListing"], [class*="job-listing"], div[data-job-id]').each((_, element) => {
      const $job = $(element);
      
      const title = $job.find('h2, h3, [class*="title"]').first().text().trim();
      const company = $job.find('[class*="company"], [class*="Company"]').first().text().trim();
      const $link = $job.find('a[href*="/jobs/"], a[href*="/company/"]').first();
      const jobUrl = $link.attr('href');
      const location = $job.find('[class*="location"], [class*="Location"]').text().trim();
      const batch = $job.find('[class*="batch"], [class*="Batch"]').text().trim();
      const funding = $job.find('[class*="funding"], [class*="stage"]').text().trim();

      if (title && jobUrl) {
        const jobId = $job.attr('data-job-id') || jobUrl.split('/').pop() || Date.now();

        jobs.push({
          id: `yc-${jobId}`,
          title,
          company: company || 'YC Startup',
          location: location || 'Not specified',
          batch: batch || null,
          funding: funding || null,
          url: jobUrl.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl}`,
          source: 'Y Combinator',
          scrapedAt: new Date().toISOString(),
        });
      }
    });

    // Alternative: Try parsing from embedded JSON data
    if (jobs.length === 0) {
      // Look for Next.js data
      const scriptContent = $('script#__NEXT_DATA__').html();
      if (scriptContent) {
        try {
          const data = JSON.parse(scriptContent);
          const jobsData = data?.props?.pageProps?.jobs || [];
          
          jobsData.forEach(job => {
            jobs.push({
              id: `yc-${job.id || job.slug}`,
              title: job.title || job.name,
              company: job.company?.name || job.companyName || 'YC Startup',
              location: job.location || job.locations?.join(', ') || 'Not specified',
              batch: job.company?.batch || job.batch,
              funding: job.company?.stage || job.stage,
              url: job.url || `${BASE_URL}/jobs/${job.slug || job.id}`,
              source: 'Y Combinator',
              scrapedAt: new Date().toISOString(),
            });
          });
        } catch (e) {
          logger.debug('Y Combinator: Could not parse embedded JSON');
        }
      }
    }

    // Try scraping company cards if job listings not found
    if (jobs.length === 0) {
      $('[class*="CompanyCard"], [class*="company-card"]').each((_, element) => {
        const $card = $(element);
        const company = $card.find('h2, h3, [class*="name"]').first().text().trim();
        const batch = $card.find('[class*="batch"]').text().trim();
        
        $card.find('[class*="job"], [class*="role"], a[href*="/jobs/"]').each((_, jobEl) => {
          const $jobEl = $(jobEl);
          const title = $jobEl.text().trim();
          const jobUrl = $jobEl.attr('href') || $card.find('a').first().attr('href');

          if (title && title.length > 3) {
            jobs.push({
              id: `yc-${company}-${title}`.replace(/\s+/g, '-').toLowerCase(),
              title,
              company: company || 'YC Startup',
              batch: batch || null,
              url: jobUrl?.startsWith('http') ? jobUrl : `${BASE_URL}${jobUrl || ''}`,
              source: 'Y Combinator',
              scrapedAt: new Date().toISOString(),
            });
          }
        });
      });
    }

    logger.debug(`Y Combinator: Found ${jobs.length} jobs`);
  } catch (error) {
    logger.error('Y Combinator: Error scraping:', error.message);
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
  logger.info('Y Combinator: Scraping YC startup jobs...');

  const allJobs = await scrapeJobs();
  const filteredJobs = filterJobs(allJobs);

  logger.info(`Y Combinator: Found ${filteredJobs.length} matching jobs (${allJobs.length} total)`);

  return filteredJobs;
}

module.exports = {
  scrape,
  scrapeJobs,
  filterJobs,
};

