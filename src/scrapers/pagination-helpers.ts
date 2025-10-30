/**
 * Pagination helper functions for web scraping
 *
 * This module provides reusable pagination utilities for handling
 * both button-based and URL-based pagination strategies.
 */

import { Page } from 'playwright';
import { logger } from '../services/logger';

/**
 * Extracts total game count from pagination text
 * Examples: "Mostrando 24 de 195 resultados", "Showing 24 of 195", "199 Games"
 */
export async function extractTotalCount(page: Page): Promise<number> {
  // Try multiple selectors as pagination text can be in different elements
  const possibleSelectors = [
    'text=/mostrando.*de.*resultados/i', // Spanish (PS Store) - try first
    'text=/\\d+\\s+games/i', // Backloggd: "199 Games"
    'text=/showing.*of.*results/i', // English
    '[data-qa*="results"]', // Data attribute
    '.pagination-info', // Class-based
  ];

  for (const selector of possibleSelectors) {
    try {
      // Use faster approach with shorter timeout per selector
      const element = page.locator(selector).first();
      const text = await element.textContent({ timeout: 3000 });

      if (text) {
        // Extract numbers: "Mostrando 24 de 195 resultados" -> [24, 195]
        const regex = /(\d+)\s+(?:de|of)\s+(\d+)/i;
        const match = regex.exec(text);
        if (match) {
          const totalGames = Number.parseInt(match[2], 10);
          logger.info(`Found total games: ${totalGames} from text: "${text.trim()}"`);
          return totalGames;
        }

        // Try to match simple count pattern: "199 Games"
        const simpleMatch = /(\d+)\s+games/i.exec(text);
        if (simpleMatch) {
          const totalGames = Number.parseInt(simpleMatch[1], 10);
          logger.info(`Found total games: ${totalGames} from text: "${text.trim()}"`);
          return totalGames;
        }
      }
    } catch {
      // Try next selector
      continue;
    }
  }

  // Fallback: count games on first page and estimate
  logger.warn('Could not extract total count, will scrape until no more pages');
  return Infinity;
}

/**
 * Determines if site uses button-based or URL-based pagination
 */
export async function detectPaginationType(page: Page): Promise<'button' | 'url'> {
  const currentUrl = page.url();

  // Check if URL has query parameter-based pagination
  if (currentUrl.includes('page=') || currentUrl.includes('offset=')) {
    logger.info('Detected URL-based pagination (query parameters)');
    return 'url';
  }

  // Check if URL has path-based pagination (e.g., /category/id/1, /category/id/2)
  // PlayStation Store uses this pattern: .../category/{uuid}/{page_number}
  const pathPaginationPattern = /\/\d+\/?$/;
  if (pathPaginationPattern.test(currentUrl)) {
    logger.info('Detected URL-based pagination (path-based)');
    return 'url';
  }

  // Check for common pagination buttons
  const nextButtonSelectors = [
    'button:has-text("Next")',
    'button:has-text("Siguiente")',
    'a:has-text("Next")',
    '[data-qa*="next"]',
    '.pagination .next',
    'button[aria-label*="next" i]',
  ];

  for (const selector of nextButtonSelectors) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      logger.info('Detected button-based pagination');
      return 'button';
    }
  }

  // Default to button
  logger.info('Pagination type unclear, defaulting to button-based');
  return 'button';
}

/**
 * Navigates to the next page based on pagination strategy
 * Returns false if no next page exists
 */
export async function navigateToNextPage(
  page: Page,
  strategy: 'button' | 'url',
  currentPage: number
): Promise<boolean> {
  if (strategy === 'button') {
    // Find and click next button
    const nextButtonSelectors = [
      'button:has-text("Next")',
      'button:has-text("Siguiente")',
      'a:has-text("Next")',
      '[data-qa*="next"]',
      '.pagination .next',
      'button[aria-label*="next" i]',
    ];

    for (const selector of nextButtonSelectors) {
      try {
        const button = page.locator(selector).first();

        // Check if button is disabled or doesn't exist
        if (!(await button.isVisible())) continue;
        if (await button.isDisabled().catch(() => false)) {
          logger.info('Next button is disabled, no more pages');
          return false;
        }

        // Click and wait for navigation or content load
        await Promise.all([
          button.click(),
          // Wait for either URL change or network idle
          Promise.race([
            page.waitForURL(/.*/, { timeout: 5000 }).catch(() => {}),
            page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {}),
          ]),
        ]);

        logger.info('Successfully navigated to next page via button');
        return true;
      } catch {
        // Try next selector
        continue;
      }
    }

    logger.info('No next button found, reached last page');
    return false;
  } else {
    // URL-based pagination
    const currentUrl = page.url();
    const nextPage = currentPage + 1;

    // Modify URL for next page
    let nextUrl: string;
    if (currentUrl.includes('page=')) {
      // Query parameter: ?page=1
      nextUrl = currentUrl.replace(/page=\d+/, `page=${nextPage}`);
    } else if (currentUrl.includes('offset=')) {
      // Query parameter: ?offset=24
      // Assuming 24 items per page (common default)
      const offset = nextPage * 24;
      nextUrl = currentUrl.replace(/offset=\d+/, `offset=${offset}`);
    } else {
      // Path-based pagination: /category/id/1 -> /category/id/2
      // PlayStation Store uses this pattern
      const pathPattern = /\/\d+\/?$/;
      if (pathPattern.test(currentUrl)) {
        nextUrl = currentUrl.replace(/\/(\d+)\/?$/, `/${nextPage}`);
        logger.info(`Path-based pagination: ${currentUrl} -> ${nextUrl}`);
      } else {
        // Add page parameter as fallback
        const separator = currentUrl.includes('?') ? '&' : '?';
        nextUrl = `${currentUrl}${separator}page=${nextPage}`;
      }
    }

    try {
      await page.goto(nextUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      logger.info(`Navigated to next page via URL: ${nextUrl}`);
      return true;
    } catch (error) {
      logger.error(`Failed to navigate to ${nextUrl}:`, error);
      return false;
    }
  }
}
