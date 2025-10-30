import { TwitterApi } from 'twitter-api-v2';
import { chromium, Browser } from 'playwright';
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
  private browser: Browser | null = null;

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
          logger.info(`[DRY RUN] Would fetch image from: ${game.url || 'N/A'}`);
          successCount++;
          continue;
        }

        // Fetch and upload image
        let mediaId: string | null = null;

        if (game.url) {
          logger.info(`Fetching image for "${game.title}"...`);
          const imageBuffer = await this.fetchGameImage(game.url);

          if (imageBuffer) {
            mediaId = await this.uploadImageToTwitter(imageBuffer, game.url);
          } else {
            logger.warn(`No image found for "${game.title}", posting text-only tweet`);
          }
        } else {
          logger.warn(`No URL for "${game.title}", posting text-only tweet`);
        }

        // Post tweet with or without media
        const tweetPayload: any = { text: tweetText };

        if (mediaId) {
          tweetPayload.media = { media_ids: [mediaId] };
          logger.info('Tweet will include image');
        }

        const response = await this.client.v2.tweet(tweetPayload);

        logger.success(
          `🐦 Tweet posted for "${game.title}" (ID: ${response.data.id})${mediaId ? ' with image' : ''}`
        );
        successCount++;

        // Rate limiting: wait 2 seconds between tweets (increased for image processing)
        if (successCount < gamesToAdd.length) {
          await this.sleep(2000);
        }
      } catch (error) {
        logger.error(`Failed to post tweet for "${game.title}"`, error);
        errorCount++;
      }
    }

    // Cleanup browser after all tweets
    await this.cleanup();

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
    const baseText = `🎮 New PS5 Pro Enhanced Game!\n${game.title}`;
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
      tweet = `🎮 New PS5 Pro Enhanced Game!\n${truncatedTitle}\n\n${hashtags}`;
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

  /**
   * Fetches the primary game image from PS Store page
   * Returns Buffer for uploading to Twitter, or null if failed
   */
  private async fetchGameImage(gameUrl: string | undefined): Promise<Buffer | null> {
    if (!gameUrl) {
      logger.warn('No game URL provided for image fetch');
      return null;
    }

    try {
      // Launch browser if not already running (for reuse)
      this.browser ??= await chromium.launch({
        headless: true,
        timeout: 30000,
      });

      const page = await this.browser.newPage();

      // Set realistic headers (same as PS Store scraper)
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      });

      logger.info(`Fetching image from: ${gameUrl}`);

      // Navigate to game page
      await page.goto(gameUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for images to load (try multiple selectors)
      try {
        await page.waitForSelector('img[src*="image.api.playstation.com"]', {
          timeout: 10000,
        });
      } catch {
        logger.warn('Primary image selector timed out, trying fallback');
        await page.waitForTimeout(3000);
      }

      // Extract primary image URL - prioritize by actual dimensions
      let imageUrl: string | null = null;

      // Strategy 1: Find the largest PlayStation CDN image by natural dimensions
      imageUrl = await page
        .$$eval('img[src*="image.api.playstation.com"]', (images) => {
          // Filter out rating/descriptor icons and small thumbnails
          const gameImages = images
            .filter((img: any) => {
              const src = img.src || '';
              // Exclude rating and descriptor images
              if (src.includes('/ratings/') || src.includes('/descriptors/')) {
                return false;
              }
              // Exclude explicit thumbnails
              if (src.includes('thumb=true')) {
                return false;
              }
              return true;
            })
            .map((img: any) => ({
              src: img.src,
              width: img.naturalWidth || img.width || 0,
              height: img.naturalHeight || img.height || 0,
            }))
            .filter((img: any) => img.width > 0 && img.height > 0)
            .sort((a: any, b: any) => b.width * b.height - a.width * a.height);

          return gameImages.length > 0 ? gameImages[0].src : null;
        })
        .catch(() => null);

      // Strategy 2: Fallback to largest image on page
      if (!imageUrl) {
        imageUrl = await page
          .$$eval('img', (images) => {
            const validImages = images
              .map((img: any) => ({
                src: img.src,
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
              }))
              .filter((img: any) => img.width >= 600 && img.height >= 400)
              .sort((a: any, b: any) => b.width * b.height - a.width * a.height);

            return validImages.length > 0 ? validImages[0].src : null;
          })
          .catch(() => null);
      }

      // Strategy 3: First large HTTPS image
      if (!imageUrl) {
        imageUrl = await page
          .$eval('img[src^="https://"]', (img) => {
            const width = (img as any).naturalWidth || (img as any).width || 0;
            const height = (img as any).naturalHeight || (img as any).height || 0;
            if (width >= 300 && height >= 200) {
              return (img as any).src;
            }
            return null;
          })
          .catch(() => null);
      }

      await page.close();

      if (!imageUrl) {
        logger.warn(`No suitable image found on page: ${gameUrl}`);
        return null;
      }

      // Download image to buffer
      logger.info(`Downloading image: ${imageUrl}`);
      const imageBuffer = await this.downloadImageToBuffer(imageUrl);

      if (!imageBuffer) {
        logger.warn('Failed to download image to buffer');
        return null;
      }

      logger.success(`Image fetched successfully (${imageBuffer.length} bytes)`);
      return imageBuffer;
    } catch (error) {
      logger.error('Failed to fetch game image', error);
      return null;
    }
  }

  /**
   * Downloads an image from URL to Buffer
   */
  private async downloadImageToBuffer(imageUrl: string): Promise<Buffer | null> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        logger.error(`Image fetch failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return buffer;
    } catch (error) {
      logger.error('Failed to download image', error);
      return null;
    }
  }

  /**
   * Uploads image to Twitter and returns media_id
   * Returns null if upload fails
   */
  private async uploadImageToTwitter(
    imageBuffer: Buffer,
    imageUrl: string
  ): Promise<string | null> {
    if (!this.client) {
      logger.error('Twitter client not initialized');
      return null;
    }

    try {
      // Detect image type from URL or default to jpg
      let mimeType: string = 'image/jpeg';
      if (imageUrl.includes('.png')) mimeType = 'image/png';
      else if (imageUrl.includes('.gif')) mimeType = 'image/gif';
      else if (imageUrl.includes('.webp')) mimeType = 'image/webp';

      logger.info(`Uploading image to Twitter (${imageBuffer.length} bytes, type: ${mimeType})`);

      // Upload using v1 API
      const mediaId = await this.client.v1.uploadMedia(imageBuffer, {
        mimeType: mimeType,
      });

      logger.success(`Image uploaded to Twitter (media_id: ${mediaId})`);
      return mediaId;
    } catch (error) {
      logger.error('Failed to upload image to Twitter', error);
      return null;
    }
  }

  /**
   * Cleanup browser instance when service is done
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser instance closed');
    }
  }
}

export default TwitterService;
