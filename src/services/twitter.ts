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
    if (game.url && tweet.length + game.url.length + 2 < 280) {
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default TwitterService;
