# PRP-004: Telegram and Twitter Notifications

## 1. Project Overview

### Feature Description
Implement notification integrations with Telegram and Twitter (X) to automatically inform stakeholders about changes detected by the script. Telegram will send notifications to a channel for the human maintainer, while Twitter will post public updates about new PS5 Pro enhanced games.

### Source Requirements
- **Feature Document**: features-doc/004-notifications.md
- **Files to Create**:
  - `src/services/telegram.ts`
  - `src/services/twitter.ts`
  - `src/services/notifications.ts` (orchestrator)
  - `src/types/notifications.ts`
- **Files to Modify**:
  - `src/index.ts` (integrate notifications)
  - `.env.example` (add API credentials)
  - `package.json` (add dependencies)

### Current Behavior
The script currently only logs comparison results to the console (src/index.ts:60-70). Results are visible only to users running the script locally with no external notifications or social media updates.

### Desired Outcome

**Telegram Notifications:**
1. Send a summary notification when the script detects changes (gamesToAdd or gamesToRemove)
2. Include formatted list of games to add/remove
3. Send a success notification when everything is in sync
4. Use Markdown formatting for readability
5. Support sending to Telegram channels

**Twitter Posts:**
1. Create one tweet per new game addition
2. Include game title and relevant hashtags (#PS5Pro, #PlayStation)
3. Only post when games need to be added (not for removals)
4. Handle rate limits gracefully
5. Log all posted tweets for tracking

**General Requirements:**
- Notifications should be optional (controlled by environment variables)
- Graceful error handling (script shouldn't fail if notifications fail)
- Clear logging for debugging notification issues
- Support dry-run mode (log what would be sent without actually sending)

---

## 2. Technical Context

### Current Implementation Analysis

**Main Entry Point** (`src/index.ts`):
- Lines 32-78: Main function that orchestrates scraping and comparison
- Lines 60-70: Logs comparison results and determines exit code
- **Key Insight**: Notification integration should happen after comparison but before exit
- **Integration Point**: After line 60 (logComparisonResults), add notification calls

**Logger Service** (`src/services/logger.ts`):
- Lines 3-61: Singleton logger with info, error, success, warn methods
- Lines 23-61: `logComparisonResults()` formats comparison output
- **Key Insight**: Follow same pattern for notification services (singleton pattern)
- **Logging Style**: Use logger.info/error/success for notification status

**Comparison Service** (`src/services/comparison.ts`):
- Returns ComparisonResult with gamesToAdd, gamesToRemove, alreadyInSync
- **Key Insight**: This data structure is what notifications will consume

**Type Definitions** (`src/types/game.ts`):
- Lines 1-56: Existing interfaces for Game, ComparisonResult, etc.
- **Key Insight**: Add notification-specific types here

**Environment Configuration** (`.env.example`):
- Lines 1-8: Current environment variables for URLs and settings
- **Key Insight**: Add Telegram and Twitter credentials here

### Dependencies Analysis

**Current Dependencies** (`package.json`):
- dotenv: ^16.6.1 (environment variable management)
- playwright: ^1.56.1 (web scraping)
- TypeScript: ^5.9.3 (type safety)
- **New Dependencies Needed**:
  - Telegram Bot API client
  - Twitter API v2 client

**Recommended NPM Packages**:

1. **Telegram**: `node-telegram-bot-api` + `@types/node-telegram-bot-api`
   - Most popular (537 dependent packages)
   - Simple API for sending messages
   - TypeScript type definitions available
   - Lightweight and reliable

2. **Twitter**: `twitter-api-v2`
   - Strongly typed for TypeScript
   - Supports both API v1.1 and v2
   - Official Twitter Developer Platform recommendation
   - Built-in OAuth 2.0 support

---

## 3. External Resources & Documentation

### Telegram Bot API

**Official Documentation**:
- Main API Docs: https://core.telegram.org/bots/api
- sendMessage Method: https://core.telegram.org/bots/api#sendmessage

**Key Information**:
- **Authentication**: Bot token from BotFather (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
- **Endpoint**: `https://api.telegram.org/bot<token>/sendMessage`
- **Required Parameters**: `chat_id` (channel ID or @username), `text` (message content)
- **Formatting**: Supports Markdown and HTML via `parse_mode` parameter
- **Channel Support**: Use channel username with @ prefix or numeric channel ID

**NPM Package**:
- Package: https://www.npmjs.com/package/node-telegram-bot-api
- GitHub: https://github.com/yagop/node-telegram-bot-api
- Types: https://www.npmjs.com/package/@types/node-telegram-bot-api

**Example Usage**:
```typescript
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(token);
await bot.sendMessage(chatId, 'Message text', { parse_mode: 'Markdown' });
```

### Twitter (X) API v2

**Official Documentation**:
- Main API Docs: https://developer.x.com/en/docs/x-api
- POST /2/tweets: https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets
- API Tools & Libraries: https://developer.twitter.com/en/docs/twitter-api/tools-and-libraries/v2

**Key Information**:
- **Authentication**: OAuth 2.0 access token (requires App credentials)
- **Endpoint**: `POST https://api.x.com/2/tweets`
- **Required Parameters**: `text` (tweet content, max 280 characters)
- **Rate Limits**: Free tier allows limited posts per month
- **Access Levels**: Requires at least Free access tier (Project setup required)

**NPM Package**:
- Package: https://www.npmjs.com/package/twitter-api-v2
- GitHub: https://github.com/PLhery/node-twitter-api-v2
- Docs: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/basics.md

**Example Usage**:
```typescript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

await client.v2.tweet('Tweet text here');
```

### TypeScript Service Patterns

**Singleton Pattern** (used in logger.ts):
```typescript
// Export singleton instance
export const serviceName = {
  method1: () => {},
  method2: () => {},
};
```

**Error Handling Pattern** (used in scrapers):
```typescript
try {
  // Operation
  logger.info('Success message');
} catch (error) {
  logger.error('Error message', error);
  // Graceful degradation
}
```

---

## 4. Implementation Blueprint

### Recommended Approach: Modular Service Architecture

After analyzing the codebase and requirements, the **modular service approach** is recommended:

1. **Separate Services**: Individual telegram.ts and twitter.ts for API integrations
2. **Orchestrator Service**: notifications.ts to coordinate all notification services
3. **Type Definitions**: Clear interfaces in types/notifications.ts
4. **Optional Execution**: Environment variable flags to enable/disable notifications
5. **Graceful Degradation**: Script continues even if notifications fail

This approach provides:
- **Separation of Concerns**: Each API integration is isolated
- **Testability**: Easy to test each service independently
- **Maintainability**: Changes to one service don't affect others
- **Extensibility**: Easy to add Discord, Slack, etc. in the future
- **Type Safety**: Full TypeScript support throughout

### File Structure

```
src/
├── services/
│   ├── telegram.ts          [NEW FILE] - Telegram API integration
│   ├── twitter.ts           [NEW FILE] - Twitter API integration
│   └── notifications.ts     [NEW FILE] - Notification orchestrator
├── types/
│   └── notifications.ts     [NEW FILE] - Notification type definitions
├── index.ts                 [MODIFY] - Add notification calls
└── ...
.env.example                 [MODIFY] - Add API credentials
package.json                 [MODIFY] - Add dependencies
```

### Phase 1: Add Type Definitions

```typescript
// src/types/notifications.ts

import { ComparisonResult } from './game';

/**
 * Configuration for Telegram notifications
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

/**
 * Configuration for Twitter notifications
 */
export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  enabled: boolean;
}

/**
 * Overall notification configuration
 */
export interface NotificationConfig {
  telegram: TelegramConfig;
  twitter: TwitterConfig;
  dryRun: boolean; // If true, log what would be sent without sending
}

/**
 * Result of sending a notification
 */
export interface NotificationResult {
  service: 'telegram' | 'twitter';
  success: boolean;
  error?: string;
  messagesSent?: number;
}

/**
 * Data to be sent in notifications
 */
export interface NotificationData {
  comparisonResult: ComparisonResult;
  timestamp: Date;
  hasChanges: boolean;
}
```

### Phase 2: Implement Telegram Service

```typescript
// src/services/telegram.ts

import TelegramBot from 'node-telegram-bot-api';
import { ComparisonResult } from '../types/game';
import { TelegramConfig, NotificationResult } from '../types/notifications';
import { logger } from './logger';

/**
 * Telegram notification service
 * Sends formatted messages to a Telegram channel about game list changes
 */
class TelegramService {
  private bot: TelegramBot | null = null;
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;

    if (config.enabled && config.botToken) {
      try {
        this.bot = new TelegramBot(config.botToken);
        logger.info('📱 Telegram service initialized');
      } catch (error) {
        logger.error('Failed to initialize Telegram bot', error);
      }
    }
  }

  /**
   * Sends a notification about comparison results
   */
  async sendComparisonNotification(
    result: ComparisonResult,
    dryRun: boolean = false
  ): Promise<NotificationResult> {
    if (!this.config.enabled) {
      logger.info('Telegram notifications disabled, skipping');
      return { service: 'telegram', success: true, messagesSent: 0 };
    }

    if (!this.bot) {
      const error = 'Telegram bot not initialized';
      logger.error(error);
      return { service: 'telegram', success: false, error };
    }

    try {
      const hasChanges = result.gamesToAdd.length > 0 || result.gamesToRemove.length > 0;
      const message = this.formatComparisonMessage(result, hasChanges);

      if (dryRun) {
        logger.info('🔍 [DRY RUN] Would send Telegram message:');
        logger.info(message);
        return { service: 'telegram', success: true, messagesSent: 1 };
      }

      await this.bot.sendMessage(this.config.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });

      logger.success('📱 Telegram notification sent successfully');
      return { service: 'telegram', success: true, messagesSent: 1 };
    } catch (error) {
      logger.error('Failed to send Telegram notification', error);
      return {
        service: 'telegram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Formats comparison result into a Markdown message
   */
  private formatComparisonMessage(result: ComparisonResult, hasChanges: boolean): string {
    const timestamp = new Date().toISOString();

    if (!hasChanges) {
      return `🎉 *PS5 Pro Enhanced Games - All Synced!*\n\n` +
             `✅ All ${result.alreadyInSync.length} games are perfectly synced\n` +
             `🕐 ${timestamp}\n\n` +
             `No action required!`;
    }

    let message = `📊 *PS5 Pro Enhanced Games - Update Required*\n\n`;
    message += `🕐 ${timestamp}\n\n`;

    // Games to add
    if (result.gamesToAdd.length > 0) {
      message += `✅ *Games to Add (${result.gamesToAdd.length}):*\n`;
      result.gamesToAdd.slice(0, 10).forEach((game, index) => {
        message += `${index + 1}. ${game.title}\n`;
      });
      if (result.gamesToAdd.length > 10) {
        message += `   ... and ${result.gamesToAdd.length - 10} more\n`;
      }
      message += '\n';
    }

    // Games to remove
    if (result.gamesToRemove.length > 0) {
      message += `❌ *Games to Remove (${result.gamesToRemove.length}):*\n`;
      result.gamesToRemove.slice(0, 10).forEach((game, index) => {
        message += `${index + 1}. ${game.title}\n`;
      });
      if (result.gamesToRemove.length > 10) {
        message += `   ... and ${result.gamesToRemove.length - 10} more\n`;
      }
      message += '\n';
    }

    message += `✓ Already in sync: ${result.alreadyInSync.length} games\n`;
    message += `\n⚠️ Action required: Update the Backloggd list`;

    return message;
  }
}

export default TelegramService;
```

### Phase 3: Implement Twitter Service

```typescript
// src/services/twitter.ts

import { TwitterApi } from 'twitter-api-v2';
import { Game } from '../types/game';
import { TwitterConfig, NotificationResult } from '../types/notifications';
import { logger } from './logger';

/**
 * Twitter notification service
 * Posts tweets about new PS5 Pro enhanced games
 */
class TwitterService {
  private client: TwitterApi | null = null;
  private config: TwitterConfig;

  constructor(config: TwitterConfig) {
    this.config = config;

    if (config.enabled && this.hasValidCredentials()) {
      try {
        this.client = new TwitterApi({
          appKey: config.apiKey,
          appSecret: config.apiSecret,
          accessToken: config.accessToken,
          accessSecret: config.accessSecret,
        });
        logger.info('🐦 Twitter service initialized');
      } catch (error) {
        logger.error('Failed to initialize Twitter client', error);
      }
    }
  }

  /**
   * Posts tweets for new game additions
   * Creates one tweet per game
   */
  async postNewGameTweets(
    gamesToAdd: Game[],
    dryRun: boolean = false
  ): Promise<NotificationResult> {
    if (!this.config.enabled) {
      logger.info('Twitter notifications disabled, skipping');
      return { service: 'twitter', success: true, messagesSent: 0 };
    }

    if (!this.client) {
      const error = 'Twitter client not initialized';
      logger.error(error);
      return { service: 'twitter', success: false, error };
    }

    if (gamesToAdd.length === 0) {
      logger.info('No new games to tweet about');
      return { service: 'twitter', success: true, messagesSent: 0 };
    }

    let successCount = 0;
    let errorCount = 0;

    for (const game of gamesToAdd) {
      try {
        const tweetText = this.formatGameTweet(game);

        if (dryRun) {
          logger.info('🔍 [DRY RUN] Would post tweet:');
          logger.info(tweetText);
          successCount++;
          continue;
        }

        // Post tweet using v2 API
        const response = await this.client.v2.tweet(tweetText);

        logger.success(`🐦 Tweet posted for "${game.title}" (ID: ${response.data.id})`);
        successCount++;

        // Rate limiting: wait 1 second between tweets to avoid hitting limits
        if (successCount < gamesToAdd.length) {
          await this.sleep(1000);
        }
      } catch (error) {
        logger.error(`Failed to post tweet for "${game.title}"`, error);
        errorCount++;
      }
    }

    const totalGames = gamesToAdd.length;
    logger.info(`Twitter: ${successCount}/${totalGames} tweets posted successfully`);

    return {
      service: 'twitter',
      success: errorCount === 0,
      messagesSent: successCount,
      error: errorCount > 0 ? `${errorCount} tweets failed` : undefined,
    };
  }

  /**
   * Formats a game into a tweet (max 280 characters)
   */
  private formatGameTweet(game: Game): string {
    const baseText = `🎮 New PS5 Pro Enhanced Game: ${game.title}`;
    const hashtags = '#PS5Pro #PlayStation #Gaming';

    // Calculate if we have space for URL
    let tweet = `${baseText}\n\n${hashtags}`;

    // Add URL if it fits (leave some buffer for tweet length)
    if (game.url && (tweet.length + game.url.length + 2) < 280) {
      tweet += `\n${game.url}`;
    }

    // Truncate if somehow still too long
    if (tweet.length > 280) {
      const maxTitleLength = 280 - baseText.length + game.title.length - 3;
      const truncatedTitle = game.title.substring(0, maxTitleLength) + '...';
      tweet = `🎮 New PS5 Pro Enhanced Game: ${truncatedTitle}\n\n${hashtags}`;
    }

    return tweet;
  }

  /**
   * Checks if all required credentials are provided
   */
  private hasValidCredentials(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.apiSecret &&
      this.config.accessToken &&
      this.config.accessSecret
    );
  }

  /**
   * Helper to add delay between API calls
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterService;
```

### Phase 4: Implement Notification Orchestrator

```typescript
// src/services/notifications.ts

import TelegramService from './telegram';
import TwitterService from './twitter';
import { ComparisonResult } from '../types/game';
import { NotificationConfig, NotificationResult } from '../types/notifications';
import { logger } from './logger';

/**
 * Orchestrates all notification services
 * Coordinates Telegram and Twitter notifications based on comparison results
 */
class NotificationManager {
  private telegram: TelegramService;
  private twitter: TwitterService;
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.telegram = new TelegramService(config.telegram);
    this.twitter = new TwitterService(config.twitter);
  }

  /**
   * Sends all configured notifications based on comparison results
   */
  async sendNotifications(result: ComparisonResult): Promise<NotificationResult[]> {
    logger.info('📢 Starting notification process...');

    const results: NotificationResult[] = [];
    const hasChanges = result.gamesToAdd.length > 0 || result.gamesToRemove.length > 0;

    // Send Telegram notification (always send, whether changes or not)
    try {
      const telegramResult = await this.telegram.sendComparisonNotification(
        result,
        this.config.dryRun
      );
      results.push(telegramResult);
    } catch (error) {
      logger.error('Telegram notification failed', error);
      results.push({
        service: 'telegram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Send Twitter posts (only if there are games to add)
    if (hasChanges && result.gamesToAdd.length > 0) {
      try {
        const twitterResult = await this.twitter.postNewGameTweets(
          result.gamesToAdd,
          this.config.dryRun
        );
        results.push(twitterResult);
      } catch (error) {
        logger.error('Twitter notification failed', error);
        results.push({
          service: 'twitter',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else if (result.gamesToAdd.length === 0) {
      logger.info('No new games to announce on Twitter');
    }

    // Log summary
    this.logSummary(results);

    return results;
  }

  /**
   * Logs a summary of notification results
   */
  private logSummary(results: NotificationResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    if (failed === 0) {
      logger.success(`📢 All notifications sent successfully (${successful} services)`);
    } else {
      logger.warn(`📢 Notifications: ${successful} succeeded, ${failed} failed`);
    }

    results.forEach(result => {
      if (!result.success) {
        logger.error(`${result.service} failed: ${result.error}`);
      }
    });
  }
}

/**
 * Creates notification configuration from environment variables
 */
export function createNotificationConfig(): NotificationConfig {
  return {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      enabled: process.env.TELEGRAM_ENABLED === 'true',
    },
    twitter: {
      apiKey: process.env.TWITTER_API_KEY || '',
      apiSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
      accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
      enabled: process.env.TWITTER_ENABLED === 'true',
    },
    dryRun: process.env.NOTIFICATIONS_DRY_RUN === 'true',
  };
}

export default NotificationManager;
```

### Phase 5: Integrate with Main Script

```typescript
// src/index.ts
// Modify the main function to include notifications

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { scrapePlayStationStore } from './scrapers/playstation-store';
import { scrapeBackloggdList } from './scrapers/backloggd';
import { compareGameLists } from './services/comparison';
import { logger } from './services/logger';
import { Game } from './types/game';
import NotificationManager, { createNotificationConfig } from './services/notifications'; // ADD THIS IMPORT

// ... existing saveTitlesToFile function ...

async function main() {
  try {
    logger.info('🚀 Starting Backloggd PS5 Pro Maintainer...\n');

    // Step 1: Scrape PlayStation Store
    logger.info('📥 Step 1: Scraping PlayStation Store');
    const psStoreResult = await scrapePlayStationStore();
    logger.success(
      `Scraped ${psStoreResult.games.length} games from PlayStation Store\n`
    );
    saveTitlesToFile(psStoreResult.games, 'ps-store-titles.txt');

    // Step 2: Scrape Backloggd list
    logger.info('📥 Step 2: Scraping Backloggd list');
    const backloggdResult = await scrapeBackloggdList();
    logger.success(
      `Scraped ${backloggdResult.games.length} games from Backloggd\n`
    );
    saveTitlesToFile(backloggdResult.games, 'backloggd-titles.txt');

    // Step 3: Compare lists (bidirectional)
    logger.info('🔍 Step 3: Performing bidirectional comparison');
    const comparisonResult = compareGameLists(
      psStoreResult.games,
      backloggdResult.games
    );

    // Step 4: Log results
    logger.logComparisonResults(comparisonResult);

    // Step 5: Send notifications (NEW)
    logger.info('📢 Step 4: Sending notifications');
    try {
      const notificationConfig = createNotificationConfig();
      const notificationManager = new NotificationManager(notificationConfig);
      await notificationManager.sendNotifications(comparisonResult);
    } catch (error) {
      // Notifications are optional - don't fail the script if they fail
      logger.warn('Notifications failed but script continues');
      logger.error('Notification error', error);
    }

    // Summary
    const hasChanges =
      comparisonResult.gamesToAdd.length > 0 ||
      comparisonResult.gamesToRemove.length > 0;

    if (hasChanges) {
      logger.warn('⚠️  List requires updates (see above for details)');
      process.exit(0);
    } else {
      logger.success('🎉 All games are perfectly synced!');
      process.exit(0);
    }
  } catch (error) {
    logger.error('💥 Script execution failed', error);
    process.exit(1);
  }
}

main();
```

### Phase 6: Update Environment Configuration

```env
# .env.example - ADD THESE LINES

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

### Phase 7: Update Package Dependencies

```json
// package.json - ADD to dependencies

"dependencies": {
  "dotenv": "^16.6.1",
  "playwright": "^1.56.1",
  "node-telegram-bot-api": "^0.66.0",
  "twitter-api-v2": "^1.17.3"
}
```

```json
// package.json - ADD to devDependencies

"devDependencies": {
  "@types/node": "^22.18.12",
  "@types/node-telegram-bot-api": "^0.64.7",
  // ... existing dev dependencies
}
```

---

## 5. Task Breakdown (Ordered Implementation)

1. **Install Dependencies**
   - Run: `npm install node-telegram-bot-api twitter-api-v2`
   - Run: `npm install -D @types/node-telegram-bot-api`
   - Verify installation with `npm list node-telegram-bot-api twitter-api-v2`

2. **Add Type Definitions**
   - Create: `src/types/notifications.ts`
   - Add all interfaces: TelegramConfig, TwitterConfig, NotificationConfig, NotificationResult, NotificationData
   - Run: `npm run type-check` to verify

3. **Implement Telegram Service**
   - Create: `src/services/telegram.ts`
   - Implement TelegramService class with sendComparisonNotification method
   - Add message formatting with formatComparisonMessage
   - Add error handling with try-catch blocks
   - Test with dry-run mode first

4. **Implement Twitter Service**
   - Create: `src/services/twitter.ts`
   - Implement TwitterService class with postNewGameTweets method
   - Add tweet formatting with formatGameTweet
   - Implement rate limiting (1 second delay between tweets)
   - Add credential validation
   - Test with dry-run mode first

5. **Implement Notification Orchestrator**
   - Create: `src/services/notifications.ts`
   - Implement NotificationManager class
   - Add sendNotifications method to coordinate services
   - Implement createNotificationConfig helper function
   - Add summary logging

6. **Update Environment Configuration**
   - Open: `.env.example`
   - Add Telegram configuration variables
   - Add Twitter configuration variables
   - Add notification settings (dry-run flag)
   - Document each variable with comments

7. **Integrate with Main Script**
   - Open: `src/index.ts`
   - Import NotificationManager and createNotificationConfig
   - Add Step 5 after comparison results logging
   - Wrap notification calls in try-catch for graceful degradation
   - Test integration

8. **Test with Dry Run Mode**
   - Set NOTIFICATIONS_DRY_RUN=true in .env
   - Set TELEGRAM_ENABLED=true (or TWITTER_ENABLED=true)
   - Run: `npm run dev`
   - Verify dry-run logs show what would be sent
   - Check no actual messages are sent

9. **Setup Telegram Bot (Manual)**
   - Talk to @BotFather on Telegram
   - Create new bot with /newbot command
   - Copy bot token to .env TELEGRAM_BOT_TOKEN
   - Add bot to target channel as administrator
   - Get chat ID (use @userinfobot or channel username)
   - Test with TELEGRAM_ENABLED=true and dry-run=false

10. **Setup Twitter App (Manual)**
    - Visit https://developer.twitter.com/en/portal/projects-and-apps
    - Create new project and app
    - Generate API keys and access tokens
    - Copy credentials to .env
    - Test with TWITTER_ENABLED=true and dry-run=false

11. **Validation**
    - Run: `npm run type-check` (no errors)
    - Run: `npm run lint:fix` (auto-fix issues)
    - Run: `npm run build` (compiles successfully)
    - Run: `npm run dev` with dry-run (logs messages)
    - Run: `npm run dev` with real credentials (sends actual notifications)

12. **Error Handling Tests**
    - Test with invalid Telegram token (should log error and continue)
    - Test with invalid Twitter credentials (should log error and continue)
    - Test with notifications disabled (should skip gracefully)
    - Verify script never fails due to notification errors

---

## 6. Code Reference Points

### Key Files and Lines

**Type Definitions** (`src/types/game.ts`):
- Lines 1-56: Existing type interfaces
- **Add new file**: `src/types/notifications.ts` with notification-specific types

**Main Entry Point** (`src/index.ts`):
- Line 1: Add import for NotificationManager and createNotificationConfig
- Line 60: After `logger.logComparisonResults(comparisonResult)`, add notification step
- Lines 60-70: Wrap notification logic in try-catch

**Logger Service** (`src/services/logger.ts`):
- Lines 3-61: Follow same singleton pattern for notification services
- Lines 4-18: Use same logging methods (info, error, success, warn)

**Environment Configuration** (`.env.example`):
- Lines 1-8: Existing configuration
- **Add after line 8**: Telegram and Twitter credential variables

**Package Configuration** (`package.json`):
- Lines 31-34: dependencies section
- **Add**: node-telegram-bot-api, twitter-api-v2
- Lines 35-46: devDependencies section
- **Add**: @types/node-telegram-bot-api

### Patterns to Follow

**Existing Code Patterns**:

1. **Singleton Service Pattern** (logger.ts:3-61):
   - Export service as singleton object
   - Use object literal with methods
   - Follow for notification orchestrator

2. **Try-Catch Error Handling** (scrapers):
   ```typescript
   try {
     // operation
     logger.info('Success');
   } catch (error) {
     logger.error('Failed', error);
     // graceful degradation
   }
   ```

3. **Environment Variables** (.env.example):
   - Use descriptive UPPERCASE_WITH_UNDERSCORES names
   - Group related variables together
   - Add comments explaining each variable

4. **TypeScript Interfaces** (types/game.ts):
   - Clear, descriptive interface names
   - Use JSDoc comments for documentation
   - Export all public types

**Logging Style**:
```typescript
logger.info('📱 Descriptive message');
logger.success('✓ Operation successful');
logger.error('Error message', errorObject);
logger.warn('⚠️ Warning message');
```

**Import Style**:
```typescript
import ServiceClass from '../services/service-name';
import { Type1, Type2 } from '../types/type-file';
import { logger } from './logger';
```

---

## 7. Validation Gates (Executable)

### Type Checking
```bash
npm run type-check
# Expected: "Found 0 errors"
# Verifies all new TypeScript files are properly typed
# Verifies notification integrations have correct types
```

### Linting
```bash
npm run lint
# Expected: No linting errors

npm run lint:fix
# Expected: Auto-fixes all fixable issues
```

### Build
```bash
npm run build
# Expected: Compiles successfully to dist/ folder
# Verifies all imports resolve correctly
# No TypeScript errors
```

### Dependency Installation
```bash
npm list node-telegram-bot-api twitter-api-v2
# Expected: Shows installed versions
# node-telegram-bot-api@0.66.0 (or latest)
# twitter-api-v2@1.17.3 (or latest)
```

### Runtime Execution - Dry Run Mode
```bash
# Set in .env:
# TELEGRAM_ENABLED=true
# TWITTER_ENABLED=true
# NOTIFICATIONS_DRY_RUN=true

npm run dev
# Expected output:
# [INFO] ... - 📱 Telegram service initialized
# [INFO] ... - 🐦 Twitter service initialized
# [INFO] ... - 📢 Starting notification process...
# [INFO] ... - 🔍 [DRY RUN] Would send Telegram message:
# [INFO] ... - (formatted message preview)
# [INFO] ... - 🔍 [DRY RUN] Would post tweet:
# [INFO] ... - (tweet preview)
# [SUCCESS] ... - 📢 All notifications sent successfully
```

### Runtime Execution - Disabled Notifications
```bash
# Set in .env:
# TELEGRAM_ENABLED=false
# TWITTER_ENABLED=false

npm run dev
# Expected output:
# [INFO] ... - Telegram notifications disabled, skipping
# [INFO] ... - Twitter notifications disabled, skipping
# [SUCCESS] ... - 📢 All notifications sent successfully (0 services)
# Script should complete normally
```

### Runtime Execution - Real Notifications (After Setup)
```bash
# Set in .env with real credentials:
# TELEGRAM_ENABLED=true
# TELEGRAM_BOT_TOKEN=<real token>
# TELEGRAM_CHAT_ID=<real chat id>
# NOTIFICATIONS_DRY_RUN=false

npm run dev
# Expected output:
# [INFO] ... - 📱 Telegram service initialized
# [SUCCESS] ... - 📱 Telegram notification sent successfully
# (Check Telegram channel for actual message)
```

### Manual Verification Checklist
- [ ] All type definitions compile without errors
- [ ] Dependencies installed successfully
- [ ] Telegram service initializes correctly
- [ ] Twitter service initializes correctly
- [ ] Dry-run mode logs messages without sending
- [ ] Disabled notifications skip gracefully
- [ ] Script continues even if notifications fail
- [ ] Telegram sends formatted messages to channel
- [ ] Twitter posts one tweet per new game
- [ ] Rate limiting works (1 second between tweets)
- [ ] Environment variables are properly read
- [ ] Error messages are clear and helpful
- [ ] Build includes all new files

### Test Scenarios

**Scenario 1: No Changes (All in Sync)**
```bash
# When comparisonResult shows no changes
npm run dev
# Expected: Telegram sends "All Synced" message
# Expected: Twitter posts nothing (no new games)
```

**Scenario 2: Games to Add**
```bash
# When comparisonResult shows 3 games to add
npm run dev
# Expected: Telegram sends message listing 3 games to add
# Expected: Twitter posts 3 separate tweets (one per game)
# Expected: 1 second delay between each tweet
```

**Scenario 3: Games to Remove**
```bash
# When comparisonResult shows games to remove
npm run dev
# Expected: Telegram sends message listing games to remove
# Expected: Twitter posts nothing (only posts for additions)
```

**Scenario 4: Invalid Credentials**
```bash
# Set invalid TELEGRAM_BOT_TOKEN
npm run dev
# Expected: Error logged but script continues
# Expected: Script completes successfully
# Expected: Exit code 0
```

**Scenario 5: Network Failure**
```bash
# Simulate network failure (disconnect internet)
npm run dev
# Expected: Timeout errors logged
# Expected: Script continues and completes
# Expected: Clear error messages about network issues
```

---

## 8. Gotchas & Best Practices

### Critical Gotchas

1. **Telegram Bot Must Be Added to Channel**
   - ❌ WRONG: Just creating bot and expecting it to work
   - ✅ CORRECT: Add bot to channel as administrator before sending messages
   - **Why**: Bot needs permission to post to channels
   - **How**: Channel Settings → Administrators → Add Administrator → Search for bot

2. **Twitter API Free Tier Limitations**
   - **Rate Limits**: Free tier has monthly tweet limits (check current limits)
   - **Access Required**: Must have at least Free access tier (requires project setup)
   - **Application Required**: Need approved developer account
   - **Mitigation**: Implement rate limiting (1 second between tweets)
   - **Testing**: Use dry-run mode extensively before going live

3. **Tweet Character Limit (280)**
   - Game titles can be very long
   - Must account for hashtags, URLs, and formatting
   - **Implementation**: Truncate title if needed (see formatGameTweet method)
   - **Test**: Try with longest game titles in dataset

4. **Environment Variable Typos**
   - Easy to misspell variable names in .env
   - TypeScript won't catch these (runtime errors only)
   - **Mitigation**: Use createNotificationConfig to centralize reading
   - **Testing**: Test with missing/invalid variables

5. **Graceful Degradation is Critical**
   - Notifications should NEVER crash the main script
   - All notification code must be in try-catch blocks
   - Log errors but continue execution
   - **Why**: Scraping and comparison are more important than notifications

6. **Dry Run Mode Must Be Thorough**
   - Test ALL notification paths in dry-run first
   - Verify message formatting before sending real notifications
   - Check tweet length calculations
   - **Why**: Avoid spamming channels/feeds during development

7. **Bot Token Security**
   - NEVER commit .env file with real tokens
   - Add .env to .gitignore (should already be there)
   - Rotate tokens if accidentally exposed
   - **Security**: Treat tokens like passwords

### Best Practices

1. **Testing Strategy**
   - Start with NOTIFICATIONS_DRY_RUN=true
   - Test each service independently
   - Test with various comparison results:
     - No changes
     - Only additions
     - Only removals
     - Mixed changes
   - Test error scenarios (invalid credentials, network failures)

2. **Configuration Management**
   - Use descriptive environment variable names
   - Document each variable in .env.example
   - Provide example values
   - Group related variables together

3. **Error Messages**
   - Make error messages actionable
   - Include service name in error logs
   - Log enough context to debug issues
   - Example: "Failed to send Telegram notification: Invalid bot token"

4. **Rate Limiting (Twitter)**
   - Always add delay between API calls
   - Current: 1 second delay between tweets
   - Monitor for rate limit errors
   - Consider exponential backoff for retries (future enhancement)

5. **Message Formatting**
   - Use Markdown for Telegram (more readable)
   - Keep messages concise but informative
   - Include timestamps
   - Limit list length (10 items max, then "... and X more")
   - Use emojis sparingly for visual clarity

6. **Service Initialization**
   - Initialize services only if enabled
   - Log initialization status clearly
   - Handle initialization failures gracefully
   - Don't crash if credentials are missing

7. **Notification Timing**
   - Send notifications AFTER logging results (user sees console output first)
   - Send notifications BEFORE script exit
   - Consider async/await to ensure all notifications sent before exit

8. **Twitter Best Practices**
   - Include relevant hashtags (#PS5Pro, #PlayStation)
   - Add game URL when it fits
   - One tweet per game (better engagement)
   - Use consistent formatting
   - Consider adding game images (future enhancement)

9. **Telegram Best Practices**
   - Use Markdown formatting for readability
   - Disable web page preview for cleaner messages
   - Send single comprehensive message (not multiple)
   - Include action items (what needs to be updated)

10. **Monitoring & Logging**
    - Log every notification attempt
    - Log success/failure for each service
    - Log summary at the end
    - Make it easy to see what happened at a glance

---

## 9. Expected Outcome Examples

### Console Output - With Changes (Notifications Enabled)

```
[INFO] 2025-10-28T... - 🚀 Starting Backloggd PS5 Pro Maintainer...

[INFO] 2025-10-28T... - 📥 Step 1: Scraping PlayStation Store
✓ [SUCCESS] 2025-10-28T... - Scraped 195 games from PlayStation Store

[INFO] 2025-10-28T... - 📥 Step 2: Scraping Backloggd list
✓ [SUCCESS] 2025-10-28T... - Scraped 180 games from Backloggd

[INFO] 2025-10-28T... - 🔍 Step 3: Performing bidirectional comparison
[INFO] 2025-10-28T... - Comparison complete: 3 to add, 0 to remove, 177 in sync

================================================================================
📊 COMPARISON RESULTS
================================================================================

✅ GAMES TO ADD (3):
--------------------------------------------------------------------------------
1. Dragon Age: The Veilguard
   URL: https://store.playstation.com/...
2. Resident Evil 4
   URL: https://store.playstation.com/...
3. The Last of Us Part II Remastered
   URL: https://store.playstation.com/...

✅ No erroneous games found - list is accurate!

✓ Already in sync: 177 games

================================================================================

[INFO] 2025-10-28T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-28T... - 📱 Telegram service initialized
[INFO] 2025-10-28T... - 🐦 Twitter service initialized
[INFO] 2025-10-28T... - 📢 Starting notification process...
✓ [SUCCESS] 2025-10-28T... - 📱 Telegram notification sent successfully
✓ [SUCCESS] 2025-10-28T... - 🐦 Tweet posted for "Dragon Age: The Veilguard" (ID: 1234567890)
✓ [SUCCESS] 2025-10-28T... - 🐦 Tweet posted for "Resident Evil 4" (ID: 1234567891)
✓ [SUCCESS] 2025-10-28T... - 🐦 Tweet posted for "The Last of Us Part II Remastered" (ID: 1234567892)
[INFO] 2025-10-28T... - Twitter: 3/3 tweets posted successfully
✓ [SUCCESS] 2025-10-28T... - 📢 All notifications sent successfully (2 services)

⚠ [WARN] 2025-10-28T... - ⚠️  List requires updates (see above for details)
```

### Console Output - No Changes (All Synced)

```
[INFO] 2025-10-28T... - 🚀 Starting Backloggd PS5 Pro Maintainer...

[INFO] 2025-10-28T... - 📥 Step 1: Scraping PlayStation Store
✓ [SUCCESS] 2025-10-28T... - Scraped 180 games from PlayStation Store

[INFO] 2025-10-28T... - 📥 Step 2: Scraping Backloggd list
✓ [SUCCESS] 2025-10-28T... - Scraped 180 games from Backloggd

[INFO] 2025-10-28T... - 🔍 Step 3: Performing bidirectional comparison
[INFO] 2025-10-28T... - Comparison complete: 0 to add, 0 to remove, 180 in sync

================================================================================
📊 COMPARISON RESULTS
================================================================================

✅ No games need to be added - list is complete!

✅ No erroneous games found - list is accurate!

✓ Already in sync: 180 games

================================================================================

[INFO] 2025-10-28T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-28T... - 📱 Telegram service initialized
[INFO] 2025-10-28T... - 📢 Starting notification process...
✓ [SUCCESS] 2025-10-28T... - 📱 Telegram notification sent successfully
[INFO] 2025-10-28T... - No new games to announce on Twitter
✓ [SUCCESS] 2025-10-28T... - 📢 All notifications sent successfully (1 services)

✓ [SUCCESS] 2025-10-28T... - 🎉 All games are perfectly synced!
```

### Telegram Message - With Changes

```markdown
📊 *PS5 Pro Enhanced Games - Update Required*

🕐 2025-10-28T10:30:00.000Z

✅ *Games to Add (3):*
1. Dragon Age: The Veilguard
2. Resident Evil 4
3. The Last of Us Part II Remastered

✓ Already in sync: 177 games

⚠️ Action required: Update the Backloggd list
```

### Telegram Message - All Synced

```markdown
🎉 *PS5 Pro Enhanced Games - All Synced!*

✅ All 180 games are perfectly synced
🕐 2025-10-28T10:30:00.000Z

No action required!
```

### Twitter Tweet Example

```
🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

#PS5Pro #PlayStation #Gaming
https://store.playstation.com/en-us/product/...
```

### Console Output - Dry Run Mode

```
[INFO] 2025-10-28T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-28T... - 📱 Telegram service initialized
[INFO] 2025-10-28T... - 🐦 Twitter service initialized
[INFO] 2025-10-28T... - 📢 Starting notification process...
[INFO] 2025-10-28T... - 🔍 [DRY RUN] Would send Telegram message:
[INFO] 2025-10-28T... - 📊 *PS5 Pro Enhanced Games - Update Required*

                         🕐 2025-10-28T10:30:00.000Z

                         ✅ *Games to Add (3):*
                         1. Dragon Age: The Veilguard
                         2. Resident Evil 4
                         3. The Last of Us Part II Remastered

                         ✓ Already in sync: 177 games

                         ⚠️ Action required: Update the Backloggd list
[INFO] 2025-10-28T... - 🔍 [DRY RUN] Would post tweet:
[INFO] 2025-10-28T... - 🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

                         #PS5Pro #PlayStation #Gaming
                         https://store.playstation.com/...
✓ [SUCCESS] 2025-10-28T... - 📢 All notifications sent successfully (2 services)
```

### Console Output - Notification Failure (Graceful)

```
[INFO] 2025-10-28T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-28T... - 📱 Telegram service initialized
[ERROR] 2025-10-28T... - Failed to send Telegram notification Error: Invalid token
⚠ [WARN] 2025-10-28T... - 📢 Notifications: 1 succeeded, 1 failed
[ERROR] 2025-10-28T... - telegram failed: Invalid token
⚠ [WARN] 2025-10-28T... - Notifications failed but script continues

✓ [SUCCESS] 2025-10-28T... - 🎉 All games are perfectly synced!
```

---

## 10. Quality Checklist

- [x] All necessary context included (APIs, packages, patterns)
- [x] Validation gates are executable and specific
- [x] References existing patterns in codebase (logger, singleton, error handling)
- [x] Clear implementation path with complete code examples
- [x] Error handling documented (network failures, invalid credentials, API limits)
- [x] Gotchas identified with solutions (bot permissions, rate limits, character limits)
- [x] External documentation URLs provided (Telegram API, Twitter API, npm packages)
- [x] Specific file and line references for modifications
- [x] Task breakdown ordered by dependencies
- [x] Expected output examples provided (console, Telegram, Twitter)
- [x] Type definitions included for all new interfaces
- [x] Graceful degradation ensured (notifications never crash script)
- [x] Security considerations addressed (token management, .gitignore)
- [x] Testing strategy defined (dry-run, error scenarios, various result types)
- [x] Rate limiting implemented (Twitter API)
- [x] Multiple test scenarios documented

---

## 11. Confidence Score

**Score: 8/10**

### Strengths
- **Clear Architecture**: Modular service design with separation of concerns
- **Proven Packages**: Using well-established npm packages with TypeScript support
- **Graceful Degradation**: Notifications are optional and won't crash the script
- **Type Safety**: Full TypeScript support throughout
- **Comprehensive Error Handling**: Try-catch blocks and error logging everywhere
- **Well-Researched**: Based on official API documentation and best practices
- **Clear Integration Points**: Modifications to existing code are minimal and well-defined
- **Dry Run Support**: Safe testing without sending actual notifications
- **Follows Existing Patterns**: Uses same patterns as logger and other services
- **Complete Examples**: Full code provided for all new files

### Uncertainties (-2 points)

1. **Twitter API Access Requirements** (-1 point)
   - Twitter/X API access policies change frequently
   - Free tier limitations may be more restrictive than documented
   - Developer account approval process may take time
   - **Mitigation**: Implement Telegram first (simpler), add Twitter later
   - **Mitigation**: Extensive dry-run testing before attempting real posts
   - **Impact**: Medium - Twitter may need adjustments, but Telegram will work

2. **API Rate Limiting Specifics** (-0.5 points)
   - Exact rate limits for current Twitter free tier not fully documented
   - Could hit limits with large batches of new games
   - **Mitigation**: Implemented 1-second delay between tweets
   - **Mitigation**: Can adjust delay or batch size if needed
   - **Impact**: Low - Rate limiting is conservative, can be tuned

3. **Telegram Channel ID Discovery** (-0.5 points)
   - Getting the correct chat_id can be confusing for users
   - Documentation varies on best method (@username vs numeric ID)
   - **Mitigation**: Documented multiple methods in gotchas section
   - **Mitigation**: Can test with direct messages first (use user ID)
   - **Impact**: Low - Well-documented issue with known solutions

### Risk Mitigation Strategies

1. **Incremental Implementation**:
   - Install dependencies first
   - Implement each service separately
   - Test with dry-run mode extensively
   - Only enable real notifications after thorough testing

2. **Telegram First**:
   - Implement and test Telegram before Twitter
   - Telegram is simpler and more reliable
   - Twitter can be added later if access issues arise

3. **Comprehensive Dry Run**:
   - NOTIFICATIONS_DRY_RUN flag allows safe testing
   - Can verify message formatting without sending
   - Test all scenarios (no changes, additions, removals, mixed)

4. **Optional Notifications**:
   - TELEGRAM_ENABLED and TWITTER_ENABLED flags
   - Can run script without any notifications
   - Can enable services independently

5. **Error Handling Everywhere**:
   - All notification code wrapped in try-catch
   - Script continues even if notifications fail
   - Clear error messages for debugging

6. **Manual Setup Documentation**:
   - Clear steps for creating Telegram bot (Task 9)
   - Clear steps for Twitter app setup (Task 10)
   - Links to official documentation

### Expected One-Pass Success

With this PRP, an AI agent should successfully implement the notification system in one pass. The implementation follows clear patterns:

1. **Type Definitions**: Straightforward interfaces (30 lines)
2. **Telegram Service**: Complete class with clear methods (150 lines)
3. **Twitter Service**: Complete class with rate limiting (180 lines)
4. **Orchestrator**: Coordination logic with config builder (120 lines)
5. **Main Integration**: Simple try-catch addition (15 lines)
6. **Configuration**: Environment variables (10 lines)

Total: ~505 lines of new code, well-structured and fully documented.

The main dependencies are:
- Installing npm packages (automated)
- Adding environment variables (copy-paste)
- Creating four new files (all code provided)
- Modifying two existing files (specific lines identified)

**Manual work required** (expected and documented):
- Creating Telegram bot via @BotFather
- Setting up Twitter developer account and app
- Adding credentials to .env file

**Testing approach** (safe and incremental):
- Start with dry-run mode (no real API calls)
- Test each service independently
- Verify message formatting
- Only enable real notifications after validation

---

## 12. Additional Resources

### Telegram Resources

**Official Documentation**:
- Bot API Reference: https://core.telegram.org/bots/api
- BotFather Commands: https://core.telegram.org/bots#6-botfather
- Formatting Options: https://core.telegram.org/bots/api#formatting-options

**NPM Package**:
- node-telegram-bot-api: https://www.npmjs.com/package/node-telegram-bot-api
- GitHub Repository: https://github.com/yagop/node-telegram-bot-api
- Type Definitions: https://www.npmjs.com/package/@types/node-telegram-bot-api

**Tutorials**:
- Creating a Bot: https://core.telegram.org/bots#3-how-do-i-create-a-bot
- Channel Setup: https://telegram.org/faq_channels
- Getting Chat ID: https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id

### Twitter (X) API Resources

**Official Documentation**:
- X API Overview: https://developer.x.com/en/docs/x-api
- POST /2/tweets: https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets
- Authentication: https://developer.x.com/en/docs/authentication/oauth-2-0
- Rate Limits: https://developer.x.com/en/docs/x-api/rate-limits

**NPM Package**:
- twitter-api-v2: https://www.npmjs.com/package/twitter-api-v2
- GitHub Repository: https://github.com/PLhery/node-twitter-api-v2
- Documentation: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/basics.md

**Developer Portal**:
- Projects & Apps: https://developer.twitter.com/en/portal/projects-and-apps
- Access Levels: https://developer.x.com/en/docs/x-api/getting-started/about-x-api

### TypeScript & Node.js Patterns

**Singleton Pattern**:
- Refactoring Guru: https://refactoring.guru/design-patterns/singleton/typescript/example
- TypeScript Best Practices: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html

**Error Handling**:
- MDN Error Handling: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
- Node.js Error Handling: https://nodejs.org/api/errors.html

**Environment Variables**:
- dotenv Documentation: https://www.npmjs.com/package/dotenv
- Best Practices: https://12factor.net/config

### API Best Practices

**Rate Limiting**:
- Rate Limiting Strategies: https://cloud.google.com/architecture/rate-limiting-strategies-techniques
- Exponential Backoff: https://en.wikipedia.org/wiki/Exponential_backoff

**Security**:
- API Key Security: https://owasp.org/www-community/vulnerabilities/Insecure_Storage_of_Sensitive_Information
- Environment Variable Security: https://blog.gitguardian.com/secrets-credentials-api-git/

### Testing Resources

**Dry Run Pattern**:
- Feature Flags: https://martinfowler.com/articles/feature-toggles.html
- Testing in Production: https://increment.com/testing/testing-in-production/

**API Mocking** (future enhancement):
- Nock (HTTP Mocking): https://www.npmjs.com/package/nock
- Jest Mocking: https://jestjs.io/docs/mock-functions

---

## 13. Future Enhancements

### Short-term Improvements

1. **Enhanced Error Recovery**
   - Implement retry logic with exponential backoff
   - Queue failed notifications for retry
   - Send error summaries via Telegram

2. **Message Customization**
   - Allow custom message templates via config
   - Support for multiple languages
   - Configurable emoji usage

3. **Additional Metadata**
   - Include game release dates in tweets
   - Add game cover images to tweets (requires media upload)
   - Link to Backloggd list in Telegram messages

### Medium-term Additions

4. **Discord Integration**
   - Add Discord webhook support
   - Similar architecture to Telegram/Twitter services
   - Embed-based rich messages

5. **Slack Integration**
   - Slack webhook for team notifications
   - Formatted blocks for better readability

6. **Email Notifications**
   - SMTP or SendGrid integration
   - HTML-formatted comparison reports
   - Digest mode (weekly summaries)

### Long-term Features

7. **Notification Scheduling**
   - Queue notifications for optimal posting times
   - Batch similar updates
   - Time zone awareness

8. **Analytics & Tracking**
   - Track notification success rates
   - Monitor Twitter engagement metrics
   - Generate monthly reports

9. **Interactive Notifications**
   - Telegram bot commands (e.g., /status, /sync)
   - Twitter thread support for large updates
   - Approval workflow for updates

10. **Testing Infrastructure**
    - Unit tests for each service
    - Integration tests with API mocking
    - E2E tests with test accounts

---

**Generated with Claude Code**
**PRP Version**: 1.0
**Created**: 2025-10-28
**Scope**: Implement Telegram and Twitter notification integrations for PS5 Pro game list updates
