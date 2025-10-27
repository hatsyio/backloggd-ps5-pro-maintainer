/**
 * Scrapes PS5 Pro enhanced games from PlayStation Store
 *
 * Implementation Strategy:
 * 1. Launch Playwright browser (headless mode)
 * 2. Navigate to PS Store category URL
 * 3. Handle infinite scroll/pagination (PS Store loads dynamically)
 * 4. Wait for game grid to render (use waitForSelector)
 * 5. Extract game titles and metadata from DOM
 * 6. Handle potential lazy loading
 * 7. Close browser and return structured data
 *
 * Gotchas:
 * - PS Store uses React-based SPAs; wait for network idle
 * - Game tiles may load incrementally; scroll to bottom
 * - Store might rate-limit; add delays between actions
 * - Handle cookies/region selection dialogs
 */

import { chromium, Browser, Page } from 'playwright';
import { Game, ScraperResult } from '../types/game';
import { logger } from '../services/logger';

export async function scrapePlayStationStore(): Promise<ScraperResult> {
  const browser: Browser = await chromium.launch({
    headless: process.env.HEADLESS_MODE !== 'false',
    slowMo: 100, // Prevents aggressive scraping detection
  });

  try {
    const page: Page = await browser.newPage();

    // Set realistic user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });

    logger.info('Navigating to PlayStation Store...');
    await page.goto(process.env.PS_STORE_URL!, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(3000);

    // Handle cookie consent if present
    try {
      const cookieButton = await page.waitForSelector('button[data-qa="accept-cookies"]', {
        timeout: 5000,
      });
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      // Cookie button not found, continue
      logger.info('No cookie consent dialog found');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'ps-store-debug.png', fullPage: true });
    logger.info('Screenshot saved to ps-store-debug.png');

    // Wait for page content to load - try multiple selectors
    try {
      await page.waitForSelector('[data-qa^="search#product"]', {
        timeout: 10000,
      });
    } catch {
      logger.warn('Could not find search product selector, trying alternative...');
      // Try waiting for any product tiles
      await page.waitForTimeout(5000);
    }

    // Scroll to load all games (infinite scroll)
    await autoScroll(page);

    // Extract game data - find all links to concept pages
    const games: Game[] = await page.$$eval('a[href*="/concept/"]', (links) => {
      const gamesList: Array<{ title: string; platform: string; url: string }> = [];
      const seenUrls = new Set<string>();

      links.forEach((link) => {
        const url = link.getAttribute('href') || '';
        if (seenUrls.has(url)) return; // Skip duplicates
        seenUrls.add(url);

        // Get text content and clean it up
        const textContent = link.textContent || '';
        const lines = textContent
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        // Find the game title - it's usually the first substantial text that's not a price, badge, or image tag
        let title = '';
        for (const line of lines) {
          // Skip if it looks like a price, discount, or badge
          if (
            line.includes('€') ||
            line.includes('%') ||
            line.match(/^[0-9,. ]+$/) ||
            line.toLowerCase().includes('precio') ||
            line.toLowerCase().includes('ahorra') ||
            line.toLowerCase().includes('<img') ||
            line.length < 3 ||
            line.length > 100 ||
            line === 'Gratis' ||
            line === 'Extra' ||
            line === 'Premium' ||
            line.toLowerCase() === 'prueba de juego'
          ) {
            continue;
          }

          title = line;
          break;
        }

        if (title && url) {
          gamesList.push({
            title: title.trim(),
            platform: 'PS5 Pro',
            url: url.startsWith('http') ? url : `https://store.playstation.com${url}`,
          });
        }
      });

      return gamesList;
    });

    logger.info(`Extracted ${games.length} games from PlayStation Store`);

    // Filter out empty titles
    const validGames = games.filter((game) => game.title !== '');

    logger.info(`Scraped ${validGames.length} games from PlayStation Store`);

    return {
      games: validGames,
      timestamp: new Date(),
      source: 'playstation-store',
    };
  } catch (error) {
    logger.error('PlayStation Store scraping failed', error);
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
