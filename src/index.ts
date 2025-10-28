import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { scrapePlayStationStore } from './scrapers/playstation-store';
import { scrapeBackloggdList } from './scrapers/backloggd';
import { compareGameLists } from './services/comparison';
import { logger } from './services/logger';
import { Game } from './types/game';
import NotificationManager, { createNotificationConfig } from './services/notifications';

/**
 * Saves game titles to a file in the debug folder
 */
function saveTitlesToFile(games: Game[], filename: string): void {
  try {
    // Ensure debug directory exists
    const debugDir = join(process.cwd(), 'debug');
    mkdirSync(debugDir, { recursive: true });

    // Extract titles and join with newlines
    const titles = games.map(game => game.title).join('\n');

    // Write to file
    const filepath = join(debugDir, filename);
    writeFileSync(filepath, titles, 'utf-8');

    logger.info(`💾 Saved ${games.length} titles to ${filename}`);
  } catch (error) {
    logger.error(`Failed to save titles to ${filename}`, error);
  }
}

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

    // Step 5: Send notifications
    logger.info('📢 Step 5: Sending notifications');
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
