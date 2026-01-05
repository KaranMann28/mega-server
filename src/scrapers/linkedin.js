/**
 * LinkedIn Email Parser
 * 
 * Parses LinkedIn job alert emails from your inbox via IMAP
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create IMAP connection
 * @returns {Imap} IMAP connection
 */
function createImapConnection() {
  return new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    host: process.env.EMAIL_HOST || 'imap-mail.outlook.com',
    port: parseInt(process.env.EMAIL_PORT) || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });
}

/**
 * Extract job links from email HTML
 * @param {string} html - Email HTML content
 * @returns {Array} Array of job objects
 */
function extractJobsFromHtml(html) {
  const jobs = [];
  const $ = cheerio.load(html);
  
  // Find all LinkedIn job links
  const jobRegex = /https?:\/\/(?:www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)/gi;
  const seenIds = new Set();
  
  // Extract from links
  $('a[href*="linkedin.com/jobs/view"]').each((_, element) => {
    const href = $(element).attr('href');
    const title = $(element).text().trim();
    
    const match = href.match(/jobs\/view\/(\d+)/);
    if (match && !seenIds.has(match[1])) {
      seenIds.add(match[1]);
      jobs.push({
        id: `linkedin-${match[1]}`,
        title: title || 'Job Opportunity',
        jobId: match[1],
        url: `https://www.linkedin.com/jobs/view/${match[1]}/`,
        source: 'LinkedIn',
      });
    }
  });
  
  // Also check raw HTML for job links
  let match;
  while ((match = jobRegex.exec(html)) !== null) {
    if (!seenIds.has(match[1])) {
      seenIds.add(match[1]);
      jobs.push({
        id: `linkedin-${match[1]}`,
        title: 'Job Opportunity',
        jobId: match[1],
        url: `https://www.linkedin.com/jobs/view/${match[1]}/`,
        source: 'LinkedIn',
      });
    }
  }
  
  return jobs;
}

/**
 * Parse email subject for role info
 * @param {string} subject - Email subject
 * @returns {Object} Parsed info
 */
function parseSubject(subject) {
  // Clean subject - remove "Fw:", "Re:" prefixes
  const cleaned = subject.replace(/^(Fw:|Re:|Fwd:)\s*/i, '').trim();
  
  // Try to extract search term and role info
  // Format: "search term": Company - Role, More info
  const match = cleaned.match(/^[""]([^""]+)[""]:\s*(.*)$/);
  
  if (match) {
    return {
      searchTerm: match[1],
      roleInfo: match[2],
    };
  }
  
  return {
    searchTerm: null,
    roleInfo: cleaned,
  };
}

/**
 * Fetch and parse LinkedIn job alert emails
 * @returns {Promise<Array>} Array of job objects
 */
function parse() {
  return new Promise((resolve, reject) => {
    const jobs = [];
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      logger.debug('LinkedIn: Email credentials not configured, skipping');
      resolve(jobs);
      return;
    }
    
    const imap = createImapConnection();
    
    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          logger.error('LinkedIn: Error opening inbox:', err.message);
          imap.end();
          resolve(jobs);
          return;
        }
        
        // Search for LinkedIn job alert emails from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const searchCriteria = [
          ['FROM', 'jobalerts-noreply@linkedin.com'],
          ['SINCE', yesterday],
        ];
        
        imap.search(searchCriteria, (err, results) => {
          if (err) {
            logger.error('LinkedIn: Search error:', err.message);
            imap.end();
            resolve(jobs);
            return;
          }
          
          if (!results || results.length === 0) {
            logger.debug('LinkedIn: No new job alert emails found');
            imap.end();
            resolve(jobs);
            return;
          }
          
          logger.info(`LinkedIn: Found ${results.length} job alert emails`);
          
          const fetch = imap.fetch(results, { bodies: '' });
          let processed = 0;
          
          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  logger.error('LinkedIn: Parse error:', err.message);
                  return;
                }
                
                // Parse subject for context
                const subjectInfo = parseSubject(parsed.subject || '');
                
                // Extract jobs from HTML body
                const html = parsed.html || parsed.textAsHtml || '';
                const emailJobs = extractJobsFromHtml(html);
                
                // Add subject context to jobs
                emailJobs.forEach(job => {
                  job.emailSubject = parsed.subject;
                  job.searchTerm = subjectInfo.searchTerm;
                  if (subjectInfo.roleInfo && job.title === 'Job Opportunity') {
                    job.title = subjectInfo.roleInfo;
                  }
                  job.scrapedAt = new Date().toISOString();
                });
                
                jobs.push(...emailJobs);
                processed++;
                
                if (processed === results.length) {
                  imap.end();
                }
              });
            });
          });
          
          fetch.once('error', (err) => {
            logger.error('LinkedIn: Fetch error:', err.message);
            imap.end();
            resolve(jobs);
          });
          
          fetch.once('end', () => {
            // Give time for parsing to complete
            setTimeout(() => {
              if (imap.state !== 'disconnected') {
                imap.end();
              }
            }, 2000);
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      logger.error('LinkedIn: IMAP error:', err.message);
      resolve(jobs);
    });
    
    imap.once('end', () => {
      logger.debug(`LinkedIn: Connection closed, found ${jobs.length} jobs`);
      resolve(jobs);
    });
    
    imap.connect();
  });
}

/**
 * Filter jobs based on config filters
 * @param {Array} jobs - Array of job objects
 * @returns {Array} Filtered jobs
 */
function filterJobs(jobs) {
  const { exclude } = config.filters;

  return jobs.filter(job => {
    const titleLower = job.title.toLowerCase();

    // Check if job should be excluded
    const shouldExclude = exclude.some(term => 
      titleLower.includes(term.toLowerCase())
    );

    return !shouldExclude;
  });
}

/**
 * Main parse function
 * @returns {Promise<Array>} Array of filtered job objects
 */
async function scrape() {
  logger.info('LinkedIn: Checking job alert emails...');

  const allJobs = await parse();
  const filteredJobs = filterJobs(allJobs);

  logger.info(`LinkedIn: Found ${filteredJobs.length} jobs from emails`);

  return filteredJobs;
}

module.exports = {
  parse,
  scrape,
  extractJobsFromHtml,
  parseSubject,
  filterJobs,
};

