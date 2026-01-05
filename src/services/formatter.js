/**
 * Discord message formatter for job postings
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Format a job posting as a Discord embed
 * @param {Object} job - Job object
 * @returns {EmbedBuilder} Discord embed
 */
function formatJobEmbed(job) {
  const embed = new EmbedBuilder()
    .setTitle(job.title || 'Job Opportunity')
    .setURL(job.url)
    .setColor(getSourceColor(job.source))
    .setTimestamp();

  // Build description
  const fields = [];
  
  if (job.company) {
    fields.push({ name: 'Company', value: job.company, inline: true });
  }
  
  if (job.location) {
    fields.push({ name: 'Location', value: job.location, inline: true });
  }
  
  if (job.team || job.department) {
    fields.push({ name: 'Team', value: job.team || job.department, inline: true });
  }
  
  if (job.salary) {
    fields.push({ name: 'Compensation', value: job.salary, inline: true });
  }
  
  if (job.equity) {
    fields.push({ name: 'Equity', value: job.equity, inline: true });
  }

  // Add source
  fields.push({ name: 'Source', value: job.source, inline: true });

  embed.addFields(fields);

  // Add footer with source icon
  embed.setFooter({ text: `via ${job.source}` });

  return embed;
}

/**
 * Format a job posting as plain text
 * @param {Object} job - Job object
 * @returns {string} Formatted message
 */
function formatJobText(job) {
  const lines = ['**New Job Alert**\n'];
  
  lines.push(`**Role:** ${job.title || '?'}`);
  lines.push(`**Company:** ${job.company || '?'}`);
  lines.push(`**Location:** ${job.location || '?'}`);
  lines.push(`**Comp:** ${job.salary || '?'}`);
  lines.push(`**Source:** ${job.source}`);
  lines.push('');
  lines.push(`Apply: ${job.url}`);

  return lines.join('\n');
}

/**
 * Get color based on job source
 * @param {string} source - Job source name
 * @returns {number} Discord color
 */
function getSourceColor(source) {
  const colors = {
    'LinkedIn': 0x0A66C2,
    'Lever': 0x1DB954,
    'Greenhouse': 0x3AB549,
    'Wellfound': 0x000000,
    'Y Combinator': 0xFF6600,
  };
  return colors[source] || 0x5865F2;
}

/**
 * Format multiple jobs for batch posting
 * @param {Array} jobs - Array of job objects
 * @returns {Array} Array of formatted messages
 */
function formatJobBatch(jobs) {
  return jobs.map(job => ({
    content: formatJobText(job),
    embeds: [formatJobEmbed(job)],
  }));
}

module.exports = {
  formatJobEmbed,
  formatJobText,
  formatJobBatch,
  getSourceColor,
};

