/**
 * Scrapes Backloggd list (read-only, no authentication required)
 *
 * Implementation Strategy:
 * 1. Launch browser and navigate to public list URL
 * 2. Wait for list items to load
 * 3. Extract game titles from list
 * 4. Return structured data
 *
 * Note: Public lists don't require authentication
 */

import { chromium, Browser, Page } from 'playwright';
import { Game, ScraperResult } from '../types/game';
import { logger } from '../services/logger';
import { extractTotalCount, detectPaginationType, navigateToNextPage } from './pagination-helpers';

export async function scrapeBackloggdList(): Promise<ScraperResult> {
  const browser: Browser = await chromium.launch({
    headless: process.env.HEADLESS_MODE !== 'false',
  });

  try {
    const page: Page = await browser.newPage();

    logger.info('Navigating to Backloggd list...');
    await page.goto(process.env.BACKLOGGD_LIST_URL!, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for list to load - Backloggd uses game-cover class for game tiles
    await page.waitForSelector('.game-cover', { timeout: 10000 });

    // Extract total count from pagination text
    const totalGames = await extractTotalCount(page);

    // Initialize collection
    const allGames: Game[] = [];
    const seenUrls = new Set<string>();
    let currentPage = 1;
    let hasNextPage = true;

    // Detect pagination strategy
    const paginationStrategy = await detectPaginationType(page);

    // Pagination loop
    while (hasNextPage) {
      logger.info(`Scraping Backloggd page ${currentPage}...`);

      // Extract games from current page
      const gamesOnPage: Game[] = await page.$$eval('.game-cover', (items) => {
        return items.map((item) => {
          const link = item.closest('a');
          const title =
            link?.getAttribute('title') || item.querySelector('img')?.getAttribute('alt') || '';
          const url = link?.href || undefined;
          const id = link?.href?.split('/').pop() || undefined;

          return {
            title: title.trim(),
            platform: 'PS5',
            url,
            id,
          };
        });
      });

      // Filter duplicates and empty titles
      const newGames = gamesOnPage.filter((game) => {
        if (game.title === '') return false;
        if (game.url && seenUrls.has(game.url)) return false;
        if (game.url) seenUrls.add(game.url);
        return true;
      });

      allGames.push(...newGames);
      logger.info(
        `Extracted ${newGames.length} new games from page ${currentPage} (total: ${allGames.length}${totalGames !== Infinity ? `/${totalGames}` : ''})`
      );

      // Check if we've collected all games
      if (totalGames !== Infinity && allGames.length >= totalGames) {
        hasNextPage = false;
        break;
      }

      // Navigate to next page
      hasNextPage = await navigateToNextPage(page, paginationStrategy, currentPage);

      if (hasNextPage) {
        await page.waitForTimeout(2000); // Rate limiting
        currentPage++;
      }

      // Safety check: max 50 pages
      if (currentPage > 50) {
        logger.warn('Reached maximum page limit (50), stopping');
        break;
      }
    }

    // Filter out empty titles
    const validGames = allGames.filter((game) => game.title !== '');

    logger.info(`Found ${validGames.length} games in Backloggd list across ${currentPage} pages`);

    return {
      games: validGames,
      timestamp: new Date(),
      source: 'backloggd',
    };
  } catch (error) {
    logger.error('Backloggd scraping failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}
