# Mega Server Career Bot

A Discord bot that aggregates job postings from multiple sources and posts them to your career channel.

## Features

- **Multi-source aggregation**: LinkedIn, Lever, Greenhouse, Wellfound, Y Combinator
- **Smart filtering**: Filter by role, location, and exclude unwanted keywords
- **Deduplication**: Never see the same job twice
- **Scheduled checks**: Automatically checks for new jobs on a schedule
- **Clean formatting**: Beautiful Discord messages with all job details

## Job Sources

| Source | Method | Data Available |
|--------|--------|----------------|
| LinkedIn | Email parsing (IMAP) | Role, Company |
| Lever | Web scraping | Role, Team, Location |
| Greenhouse | Web scraping | Role, Location, Department |
| Wellfound | Web scraping | Role, Company, Salary, Equity |
| Y Combinator | RSS + scraping | Role, Company, Batch, Funding |

## Setup

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it
3. Go to "Bot" tab and click "Add Bot"
4. Copy the bot token
5. Enable "Message Content Intent" under Privileged Gateway Intents
6. Go to "OAuth2 > URL Generator"
7. Select scopes: `bot`
8. Select permissions: `Send Messages`, `Embed Links`
9. Copy the generated URL and invite the bot to your server

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `DISCORD_BOT_TOKEN`: Your bot token from step 1
- `DISCORD_CHANNEL_ID`: Right-click your career channel > Copy ID
- `EMAIL_*`: Your email credentials for LinkedIn alerts

### 3. Configure Companies

Edit `src/config.js` to add companies you want to track:

```javascript
companies: {
  lever: ['openai', 'stripe', 'figma'],
  greenhouse: ['airbnb', 'coinbase'],
}
```

### 4. Install & Run

```bash
npm install
npm start
```

## Project Structure

```
mega-server/
├── src/
│   ├── bot.js           # Main entry point
│   ├── config.js        # Configuration
│   ├── scrapers/        # Job source scrapers
│   ├── services/        # Core services
│   └── utils/           # Utilities
├── data/
│   └── jobs.db          # SQLite database
└── .env                 # Environment variables
```

## Commands

The bot runs automatically on a schedule. No commands needed!

Jobs are posted to the configured channel whenever new postings are found.

## Deployment

### Local
```bash
npm start
```

### PM2 (Production)
```bash
npm install -g pm2
pm2 start src/bot.js --name career-bot
pm2 save
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

## License

MIT

