# Backloggd PS5 Pro Maintainer

Automated script to sync PS5 Pro enhanced games between PlayStation Store and Backloggd.

## Overview

This TypeScript-based tool automatically scrapes PS5 Pro enhanced games from the PlayStation Store and compares them with a public Backloggd list. It identifies games that need to be added or removed, helping maintain an accurate and up-to-date list of PS5 Pro enhanced titles.

## Features

- **Automated Web Scraping**: Uses Playwright to extract game data from PlayStation Store and Backloggd
- **Bidirectional Comparison**: Identifies games to add and games to remove
- **Title Mapping**: Handles game title variations between platforms (e.g., "Ghost of Yōtei" vs "Ghost of Yotei")
- **Manual Additions**: Support for manually adding games not properly detected by the scraper
- **Notification System**: Automated notifications via Telegram and Twitter
  - **Telegram**: Sends summary reports to notify maintainers of changes
  - **Twitter**: Creates individual posts for each new PS5 Pro enhanced game
- **Debug Output**: Saves scraped titles to text files for verification
- **Detailed Logging**: Comprehensive logging with color-coded console output

## Tech Stack

- **TypeScript**: Type-safe JavaScript for robust code
- **Playwright**: Browser automation for web scraping
- **Node.js**: Runtime environment
- **dotenv**: Environment variable management

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/hatsyio/backloggd-ps5-pro-maintainer.git
cd backloggd-ps5-pro-maintainer
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

## Configuration

Edit the `.env` file to configure the script:

```env
# PlayStation Store URL for PS5 Pro enhanced games
PS_STORE_URL=https://store.playstation.com/es-es/category/1d443305-2dcf-4543-8f7e-8c6ec409ecbf/1

# Backloggd list URL
BACKLOGGD_LIST_URL=https://backloggd.com/u/Termeni/list/ps5-pro-enhanced-games/

# Run browser in headless mode (true/false)
HEADLESS_MODE=true

# Telegram Notifications
TELEGRAM_ENABLED=false
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=@your_channel_or_chat_id

# Twitter Notifications
TWITTER_ENABLED=false
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here

# Notification Settings
NOTIFICATIONS_DRY_RUN=false
```

### Notification Configuration

The script supports automated notifications through Telegram and Twitter:

**Telegram Configuration:**
1. Create a bot using [@BotFather](https://t.me/botfather) on Telegram
2. Get your bot token
3. Get your chat ID (use [@userinfobot](https://t.me/userinfobot) or create a channel)
4. Set `TELEGRAM_ENABLED=true` and add your credentials

**Twitter Configuration:**
1. Create a Twitter Developer account at [developer.twitter.com](https://developer.twitter.com)
2. Create an app and generate API keys and access tokens
3. Set `TWITTER_ENABLED=true` and add your credentials

**Dry Run Mode:**
Set `NOTIFICATIONS_DRY_RUN=true` to test notifications without actually sending them (useful for development).

## Usage

### Run the script

```bash
# Development mode (with tsx)
npm run dev

# Build and run
npm run build
npm start

# Debug mode (with Playwright UI)
npm run debug
```

### Available Scripts

- `npm run dev` - Run in development mode with tsx
- `npm start` - Run compiled JavaScript
- `npm run build` - Compile TypeScript to JavaScript
- `npm run type-check` - Check TypeScript types without building
- `npm run lint` - Lint the codebase
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run clean` - Remove the dist folder
- `npm run debug` - Run with Playwright debug UI

## Project Structure

```
backloggd-ps5-pro-maintainer/
├── src/
│   ├── data/
│   │   ├── game-title-mappings.json  # Maps PS Store titles to Backloggd titles
│   │   └── manual-additions.json     # Manually added games
│   ├── scrapers/
│   │   ├── backloggd.ts              # Backloggd scraper
│   │   ├── playstation-store.ts      # PS Store scraper
│   │   └── pagination-helpers.ts     # Helper for pagination
│   ├── services/
│   │   ├── comparison.ts             # Game list comparison logic
│   │   ├── logger.ts                 # Custom logging service
│   │   ├── manual-additions.ts       # Manual additions handler
│   │   ├── title-mapper.ts           # Title mapping service
│   │   ├── notifications.ts          # Notification orchestrator
│   │   ├── telegram.ts               # Telegram notification service
│   │   └── twitter.ts                # Twitter notification service
│   ├── types/
│   │   ├── game.ts                   # TypeScript type definitions
│   │   └── notifications.ts          # Notification type definitions
│   └── index.ts                      # Main entry point
├── tests/                            # Test files
├── debug/                            # Debug output (generated)
├── features-doc/                     # Feature documentation
├── PRPs/                             # Project Requirement Proposals
└── package.json
```

## How It Works

1. **Scrape PlayStation Store**: Extracts all PS5 Pro enhanced games from the official PS Store page
2. **Scrape Backloggd List**: Extracts games from the public Backloggd list
3. **Apply Title Mappings**: Normalizes game titles using the mapping file to handle variations
4. **Add Manual Entries**: Includes games from the manual additions file
5. **Bidirectional Comparison**:
   - Identifies games in PS Store but not in Backloggd (to add)
   - Identifies games in Backloggd but not in PS Store (to remove)
6. **Generate Report**: Outputs a detailed comparison report with games to add/remove
7. **Send Notifications** (if enabled):
   - **Twitter**: Posts individual tweets for each new PS5 Pro enhanced game with game images
   - **Telegram**: Sends a summary report with all changes and links to Twitter posts

### Title Mapping System

The script handles title variations between platforms:

```json
{
  "psStoreTitle": "Ghost of Yōtei",
  "backloggdTitle": "Ghost of Yotei"
}
```

### Manual Additions

Some games can be manually added via `manual-additions.json`:

```json
{
  "additions": [
    {
      "backloggdTitle": "Call of Duty: Black Ops 6",
      "reason": ""
    }
  ]
}
```

## Output

The script generates:
- Console logs with comparison results
- Debug files in `debug/` folder:
  - `ps-store-titles.txt` - Games from PlayStation Store
  - `backloggd-titles.txt` - Games from Backloggd
  - `ps-store-debug.png` - Screenshot of PS Store page

Exit codes:
- `0` - Success (with or without changes)
- `1` - Script execution failed

## Development

### Code Quality Tools

- **ESLint**: For code linting
- **Prettier**: For code formatting
- **TypeScript**: For type checking

### Running Tests

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- PlayStation Store PS5 Pro Games: https://store.playstation.com/es-es/category/1d443305-2dcf-4543-8f7e-8c6ec409ecbf/1
- Backloggd List: https://backloggd.com/u/Termeni/list/ps5-pro-enhanced-games/
- Issues: https://github.com/hatsyio/backloggd-ps5-pro-maintainer/issues
