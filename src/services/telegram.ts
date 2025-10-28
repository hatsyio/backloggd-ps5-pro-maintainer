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
      return (
        `🎉 *PS5 Pro Enhanced Games - All Synced!*\n\n` +
        `✅ All ${result.alreadyInSync.length} games are perfectly synced\n` +
        `🕐 ${timestamp}\n\n` +
        `No action required!`
      );
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
