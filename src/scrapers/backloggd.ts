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

    // Check if there are multiple pages and scroll through them
    await autoScroll(page);

    // Extract games from list
    const games: Game[] = await page.$$eval('.game-cover', (items) => {
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

    // Filter out empty titles
    const validGames = games.filter((game) => game.title !== '');

    logger.info(`Found ${validGames.length} games in Backloggd list`);

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

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        // @ts-ignore - Running in browser context
        // eslint-disable-next-line no-undef
        const scrollHeight = document.body.scrollHeight;
        // @ts-ignore - Running in browser context
        // eslint-disable-next-line no-undef
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
