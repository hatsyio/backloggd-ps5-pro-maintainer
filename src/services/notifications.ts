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
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed === 0) {
      logger.success(`📢 All notifications sent successfully (${successful} services)`);
    } else {
      logger.warn(`📢 Notifications: ${successful} succeeded, ${failed} failed`);
    }

    results.forEach((result) => {
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
