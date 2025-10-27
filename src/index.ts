import 'dotenv/config';
import { scrapePlayStationStore } from './scrapers/playstation-store';
import { scrapeBackloggdList } from './scrapers/backloggd';
import { compareGameLists } from './services/comparison';
import { logger } from './services/logger';

async function main() {
  try {
    logger.info('🚀 Starting Backloggd PS5 Pro Maintainer...\n');

    // Step 1: Scrape PlayStation Store
    logger.info('📥 Step 1: Scraping PlayStation Store');
    const psStoreResult = await scrapePlayStationStore();
    logger.success(
      `Scraped ${psStoreResult.games.length} games from PlayStation Store\n`
    );

    // Step 2: Scrape Backloggd list
    logger.info('📥 Step 2: Scraping Backloggd list');
    const backloggdResult = await scrapeBackloggdList();
    logger.success(
      `Scraped ${backloggdResult.games.length} games from Backloggd\n`
    );

    // Step 3: Compare lists (bidirectional)
    logger.info('🔍 Step 3: Performing bidirectional comparison');
    const comparisonResult = compareGameLists(
      psStoreResult.games,
      backloggdResult.games
    );

    // Step 4: Log results
    logger.logComparisonResults(comparisonResult);

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
