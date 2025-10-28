# PRP-002: Fix Scraping Strategy - Replace Infinite Scroll with Pagination

## 1. Project Overview

### Feature Description
Fix the scraping strategy for both PlayStation Store and Backloggd scrapers to properly handle pagination instead of incorrectly assuming infinite scroll. The current implementation uses an `autoScroll` function that scrolls to the bottom of the page, but both websites actually implement pagination that needs to be detected and navigated.

### Source Requirements
- **Feature Document**: features-doc/002-fix-scraping-settings.md
- **Files to Modify**:
  - `src/scrapers/playstation-store.ts`
  - `src/scrapers/backloggd.ts`

### Current Problem
The existing implementation (lines 76-77 in playstation-store.ts, line 35 in backloggd.ts) uses an infinite scroll approach:
```typescript
// Current INCORRECT approach
await autoScroll(page);
```

This is problematic because:
1. Both websites use pagination, not infinite scroll
2. The autoScroll function doesn't wait for new content to load between scrolls
3. PS Store shows pagination info like "Mostrando 24 de 195 resultados" (Showing 24 of 195 results) which indicates total games available
4. This leads to incomplete data extraction

### Desired Outcome
1. Extract total number of games from pagination text (e.g., "Mostrando 24 de 195 resultados")
2. Calculate total pages needed
3. Navigate through pagination (button clicks or URL modification)
4. Collect all games across all pages
5. Validate we've collected the expected number of games

---

## 2. Technical Context

### Current Implementation Analysis

**PlayStation Store Scraper** (`src/scrapers/playstation-store.ts`):
- Lines 76-77: Calls `autoScroll(page)` before extraction
- Lines 153-174: `autoScroll` function implementation
- The function scrolls 100px at a time until reaching page height, but doesn't handle pagination
- Extracts games from `a[href*="/concept/"]` elements (line 80)

**Backloggd Scraper** (`src/scrapers/backloggd.ts`):
- Line 35: Calls `autoScroll(page)`
- Lines 73-94: Same `autoScroll` function (duplicated code)
- Extracts games from `.game-cover` elements (line 38)

**Key Issues**:
1. Both scrapers have identical `autoScroll` functions (code duplication)
2. Neither detects or handles pagination controls
3. No extraction of total results count
4. No validation that all games were collected

### Dependencies
- **Playwright**: Already installed (^1.56.1) - supports clicking, waiting, and DOM inspection
- **TypeScript**: Already configured with strict mode
- **Existing Types**: `Game`, `ScraperResult` interfaces already defined

---

## 3. External Resources & Documentation

### Pagination Strategies with Playwright

**Official Playwright Documentation**:
- API Reference: https://playwright.dev/docs/api/class-page
- Navigation: https://playwright.dev/docs/navigations
- Locators: https://playwright.dev/docs/locators

**Best Practices for Pagination (2025)**:
- Bright Data Pagination Guide: https://brightdata.com/blog/web-data/pagination-web-scraping
- Key strategies:
  1. Button-based pagination: Find "Next" button, click, wait for content
  2. URL-based pagination: Modify URL parameters (page=1, page=2, etc.)
  3. Infinite scroll (not applicable here): Scroll and wait for dynamic loads

**Text Parsing for Pagination Info**:
- Pattern matching for "X of Y" text formats
- Common patterns: "Showing 24 of 195", "Mostrando 24 de 195 resultados"
- Extract using regex: `/(\d+)\s+(?:de|of)\s+(\d+)/i`

### Key Gotchas from Research

1. **Wait for Navigation**: After clicking "Next", must wait for network idle or new content to load
2. **Dynamic Content**: Some sites use JavaScript to load new pages without URL changes
3. **Rate Limiting**: Add delays between page loads (already using `slowMo: 100`)
4. **Stale Elements**: After navigation, must re-query DOM elements
5. **Duplicate Detection**: Games may appear on multiple pages (already handled via `seenUrls` Set in PS Store)

---

## 4. Implementation Blueprint

### Pseudocode Strategy

```typescript
// High-level pagination approach for both scrapers:

async function scrapeSiteWithPagination(page: Page): Promise<Game[]> {
  const allGames: Game[] = [];
  const seenUrls = new Set<string>();

  // Step 1: Extract total count from pagination text
  const totalGames = await extractTotalCount(page);
  logger.info(`Total games to extract: ${totalGames}`);

  // Step 2: Determine pagination strategy (button vs URL)
  const paginationStrategy = await detectPaginationType(page);

  // Step 3: Loop through pages
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    logger.info(`Scraping page ${currentPage}...`);

    // Extract games from current page
    const gamesOnPage = await extractGamesFromPage(page, seenUrls);
    allGames.push(...gamesOnPage);

    logger.info(`Extracted ${gamesOnPage.length} games from page ${currentPage} (total: ${allGames.length})`);

    // Check if we've collected all games
    if (allGames.length >= totalGames) {
      hasNextPage = false;
      break;
    }

    // Navigate to next page
    hasNextPage = await navigateToNextPage(page, paginationStrategy, currentPage);

    if (hasNextPage) {
      // Wait for new content to load
      await page.waitForTimeout(2000); // Rate limiting
      currentPage++;
    }
  }

  // Step 4: Validate we got all games
  if (allGames.length !== totalGames) {
    logger.warn(`Expected ${totalGames} games but got ${allGames.length}`);
  }

  return allGames;
}
```

### Detailed Implementation Steps

#### Step 1: Extract Total Count from Text

```typescript
/**
 * Extracts total game count from pagination text
 * Examples: "Mostrando 24 de 195 resultados", "Showing 24 of 195"
 */
async function extractTotalCount(page: Page): Promise<number> {
  // Try multiple selectors as pagination text can be in different elements
  const possibleSelectors = [
    'text=/mostrando.*de.*resultados/i',  // Spanish
    'text=/showing.*of.*results/i',        // English
    '[data-qa*="results"]',                // Data attribute
    '.pagination-info',                    // Class-based
    // Add more as needed based on inspection
  ];

  for (const selector of possibleSelectors) {
    try {
      const element = await page.locator(selector).first();
      const text = await element.textContent();

      if (text) {
        // Extract numbers: "Mostrando 24 de 195 resultados" -> [24, 195]
        const match = text.match(/(\d+)\s+(?:de|of)\s+(\d+)/i);
        if (match) {
          const totalGames = parseInt(match[2], 10);
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
```

#### Step 2: Detect Pagination Type

```typescript
/**
 * Determines if site uses button-based or URL-based pagination
 */
async function detectPaginationType(page: Page): Promise<'button' | 'url'> {
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

  // Check if URL has page parameters
  const currentUrl = page.url();
  if (currentUrl.includes('page=') || currentUrl.includes('offset=')) {
    logger.info('Detected URL-based pagination');
    return 'url';
  }

  // Default to button
  logger.info('Pagination type unclear, defaulting to button-based');
  return 'button';
}
```

#### Step 3: Navigate to Next Page

```typescript
/**
 * Navigates to the next page based on pagination strategy
 * Returns false if no next page exists
 */
async function navigateToNextPage(
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
      } catch (error) {
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
      nextUrl = currentUrl.replace(/page=\d+/, `page=${nextPage}`);
    } else if (currentUrl.includes('offset=')) {
      // Assuming 24 items per page (common default)
      const offset = nextPage * 24;
      nextUrl = currentUrl.replace(/offset=\d+/, `offset=${offset}`);
    } else {
      // Add page parameter
      const separator = currentUrl.includes('?') ? '&' : '?';
      nextUrl = `${currentUrl}${separator}page=${nextPage}`;
    }

    await page.goto(nextUrl, { waitUntil: 'networkidle', timeout: 30000 });
    logger.info(`Navigated to next page via URL: ${nextUrl}`);
    return true;
  }
}
```

#### Step 4: Refactor Scrapers

**For PlayStation Store** (`src/scrapers/playstation-store.ts`):
```typescript
// Replace lines 76-131 with:

// Extract total count
const totalGames = await extractTotalCount(page);

// Initialize collection
const allGames: Game[] = [];
const seenUrls = new Set<string>();
let currentPage = 1;
let hasNextPage = true;

// Pagination loop
while (hasNextPage) {
  logger.info(`Scraping PS Store page ${currentPage}...`);

  // Extract games from current page
  const gamesOnPage = await page.$$eval('a[href*="/concept/"]', (links) => {
    const gamesList: Array<{ title: string; platform: string; url: string }> = [];

    links.forEach((link) => {
      const url = link.getAttribute('href') || '';

      // Get text content and clean it up
      const textContent = link.textContent || '';
      const lines = textContent
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0);

      // Find the game title (same logic as before)
      let title = '';
      for (const line of lines) {
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

  // Filter duplicates
  const newGames = gamesOnPage.filter(game => {
    if (seenUrls.has(game.url)) return false;
    seenUrls.add(game.url);
    return true;
  });

  allGames.push(...newGames);
  logger.info(`Extracted ${newGames.length} new games from page ${currentPage} (total: ${allGames.length}/${totalGames})`);

  // Check if we've collected all games
  if (totalGames !== Infinity && allGames.length >= totalGames) {
    hasNextPage = false;
    break;
  }

  // Navigate to next page
  hasNextPage = await navigateToNextPage(page, await detectPaginationType(page), currentPage);

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

const validGames = allGames.filter((game) => game.title !== '');

logger.info(`Scraped ${validGames.length} games from PlayStation Store across ${currentPage} pages`);

// Remove the old autoScroll function (lines 153-174)
```

**For Backloggd** (`src/scrapers/backloggd.ts`):
```typescript
// Similar refactoring, replace lines 35-53 with pagination logic
// Apply same pattern as PS Store but using '.game-cover' selector
// Remove duplicate autoScroll function (lines 73-94)
```

---

## 5. Task Breakdown (Ordered Implementation)

1. **Create Pagination Helper Module**
   - Create `src/scrapers/pagination-helpers.ts`
   - Implement `extractTotalCount()` function
   - Implement `detectPaginationType()` function
   - Implement `navigateToNextPage()` function
   - Export all functions for use in both scrapers

2. **Update PlayStation Store Scraper**
   - Import pagination helpers
   - Replace `autoScroll(page)` call with pagination loop (lines 76-77)
   - Refactor game extraction to work within loop
   - Add logging for each page
   - Remove `autoScroll` function definition (lines 153-174)
   - Test with real PS Store URL

3. **Update Backloggd Scraper**
   - Import pagination helpers
   - Replace `autoScroll(page)` call with pagination loop (line 35)
   - Adapt pagination logic for Backloggd's DOM structure
   - Remove duplicate `autoScroll` function (lines 73-94)
   - Test with real Backloggd URL

4. **Add Validation**
   - Compare final game count with expected total
   - Log warnings if counts don't match
   - Add page limit safety check (max 50 pages)

5. **Test End-to-End**
   - Run with `npm run dev`
   - Verify all games are collected from both sites
   - Check console logs show pagination progress
   - Validate comparison results are accurate

6. **Lint and Format**
   - Run `npm run lint:fix`
   - Run `npm run format`
   - Fix any TypeScript errors

---

## 6. Code Reference Points

**Key Files and Lines to Modify**:
- `src/scrapers/playstation-store.ts:76-77` - Remove autoScroll call, add pagination
- `src/scrapers/playstation-store.ts:153-174` - Remove autoScroll function
- `src/scrapers/backloggd.ts:35` - Remove autoScroll call, add pagination
- `src/scrapers/backloggd.ts:73-94` - Remove autoScroll function

**Patterns to Follow**:
- Logging style: Use `logger.info()`, `logger.warn()` from `src/services/logger.ts`
- Error handling: Wrap scraping in try-catch blocks
- Type safety: Use existing `Game` and `ScraperResult` interfaces
- Code style: Follow existing patterns in scrapers (async/await, type annotations)

**Existing Patterns to Reuse**:
- `seenUrls` Set for duplicate detection (playstation-store.ts:82)
- Game title filtering logic (playstation-store.ts:96-119)
- Browser launch configuration (both scrapers)
- User agent setup (playstation-store.ts:34-36)

---

## 7. Validation Gates (Executable)

### Type Checking
```bash
npm run type-check
# Expected: "Found 0 errors"
```

### Linting
```bash
npm run lint
# Expected: No linting errors

npm run lint:fix
# Expected: Auto-fixes all fixable issues
```

### Build
```bash
npm run build
# Expected: Compiles successfully to dist/ folder
```

### Runtime Execution
```bash
npm run dev
# Expected output should show:
# - "Total games to extract: X" (from pagination text)
# - "Scraping page 1...", "Scraping page 2...", etc.
# - "Extracted Y games from page N (total: Z/X)"
# - Final counts matching expected totals
# - Comparison results as before
```

### Manual Verification Checklist
- [ ] PS Store scraper detects total game count from "Mostrando X de Y resultados"
- [ ] PS Store scraper navigates through multiple pages
- [ ] PS Store scraper collects all games (final count matches total)
- [ ] Backloggd scraper navigates through multiple pages
- [ ] Backloggd scraper collects all games
- [ ] No duplicate games in final results
- [ ] Console logs show clear pagination progress
- [ ] Script completes without errors
- [ ] Comparison results are accurate

---

## 8. Gotchas & Best Practices

### Critical Gotchas

1. **Pagination Detection**
   - PS Store might use button-based pagination OR URL parameters
   - Must inspect actual site during development
   - Use Playwright Inspector: `npm run debug`
   - Take screenshots to verify page state

2. **Text Extraction Variations**
   - "Mostrando 24 de 195 resultados" (Spanish)
   - Might also be "Showing 24 of 195 results" (English)
   - Text might be in different elements
   - Use multiple selector fallbacks

3. **Network Timing**
   - After clicking Next, new content may load slowly
   - Use `waitForLoadState('networkidle')` or `waitForTimeout`
   - Add 2-second delay between pages for rate limiting
   - Handle timeout errors gracefully

4. **Stale Elements**
   - After navigation, DOM elements are recreated
   - Must re-query elements on each page
   - Don't store element references across pages

5. **Infinite Loop Protection**
   - Add max page limit (50 pages) as safety
   - Check if next button is disabled
   - Validate total count increases each page

6. **Backloggd Specifics**
   - Might use "Load More" button instead of page numbers
   - Check if URL changes or content loads dynamically
   - May need different strategy than PS Store

### Best Practices

1. **Development Workflow**
   - Use `HEADLESS_MODE=false` in .env to watch pagination
   - Use Playwright Inspector for selector testing
   - Take screenshots after each page navigation
   - Log game counts after each page

2. **Error Handling**
   - Catch pagination navigation failures
   - Continue if one page fails, don't crash entire scrape
   - Log warnings for mismatched counts
   - Return partial results if needed

3. **Performance**
   - Reuse same browser/page instance across pages
   - Don't close/reopen browser for each page
   - Add reasonable delays to avoid rate limiting
   - Consider caching results during development

4. **Code Organization**
   - Extract pagination logic to shared module
   - Avoid code duplication between scrapers
   - Keep helper functions pure and testable
   - Document regex patterns and selectors

---

## 9. Expected Outcome Example

### Console Output After Fix
```
[INFO] 2025-10-27T... - 🚀 Starting Backloggd PS5 Pro Maintainer...

[INFO] 2025-10-27T... - 📥 Step 1: Scraping PlayStation Store
[INFO] 2025-10-27T... - Navigating to PlayStation Store...
[INFO] 2025-10-27T... - Found total games: 195 from text: "Mostrando 24 de 195 resultados."
[INFO] 2025-10-27T... - Detected button-based pagination
[INFO] 2025-10-27T... - Scraping PS Store page 1...
[INFO] 2025-10-27T... - Extracted 24 new games from page 1 (total: 24/195)
[INFO] 2025-10-27T... - Successfully navigated to next page via button
[INFO] 2025-10-27T... - Scraping PS Store page 2...
[INFO] 2025-10-27T... - Extracted 24 new games from page 2 (total: 48/195)
...
[INFO] 2025-10-27T... - Scraping PS Store page 9...
[INFO] 2025-10-27T... - Extracted 3 new games from page 9 (total: 195/195)
[INFO] 2025-10-27T... - Scraped 195 games from PlayStation Store across 9 pages
✓ [SUCCESS] 2025-10-27T... - Scraped 195 games from PlayStation Store

[INFO] 2025-10-27T... - 📥 Step 2: Scraping Backloggd list
[INFO] 2025-10-27T... - Navigating to Backloggd list...
[INFO] 2025-10-27T... - Scraping page 1...
[INFO] 2025-10-27T... - Extracted 50 games from page 1 (total: 50)
...
✓ [SUCCESS] 2025-10-27T... - Scraped 180 games from Backloggd

[INFO] 2025-10-27T... - 🔍 Step 3: Performing bidirectional comparison
...
```

### Key Changes in Output
- ✅ Shows total game count from pagination text
- ✅ Shows page-by-page progress
- ✅ Shows running total vs expected total
- ✅ Final counts are complete and accurate
- ✅ No missed games due to incomplete scrolling

---

## 10. Quality Checklist

- [x] All necessary context included (feature requirements, current code issues)
- [x] Validation gates are executable and specific
- [x] References existing patterns in codebase (logger, types, error handling)
- [x] Clear implementation path with pseudocode and real code examples
- [x] Error handling documented (network failures, pagination detection)
- [x] Gotchas identified with solutions (timing, selectors, infinite loops)
- [x] External documentation URLs provided (Playwright, pagination guides)
- [x] Specific file and line references for modifications
- [x] Task breakdown ordered by dependencies
- [x] Expected output examples provided
- [x] Code organization strategy (shared helpers module)
- [x] Testing strategy defined (manual verification checklist)

---

## 11. Confidence Score

**Score: 8/10**

### Strengths
- Clear understanding of the problem (infinite scroll vs pagination)
- Specific file and line references for modifications
- Comprehensive pagination strategy with multiple fallbacks
- Reusable helper module to avoid code duplication
- Detailed pseudocode and implementation examples
- Strong validation strategy (total count comparison)
- Safety mechanisms (max page limit, timeout handling)
- Existing codebase patterns are well-established and easy to follow

### Uncertainties (-2 points)
1. **Pagination Implementation Varies by Site** (-1 point)
   - PS Store and Backloggd pagination structures unknown without inspection
   - Need to test with actual sites to determine button selectors
   - **Mitigation**: Provided multiple selector fallbacks and Playwright Inspector guidance

2. **Pagination Text Location** (-1 point)
   - "Mostrando 24 de 195 resultados" text might be in various elements
   - Text format might change or be in different languages
   - **Mitigation**: Provided multiple regex patterns and selector strategies

### Risk Mitigation Strategies
1. **Incremental Testing**: Test pagination helpers on one scraper first (PS Store)
2. **Playwright Inspector**: Use `npm run debug` to inspect selectors interactively
3. **Multiple Fallbacks**: Provided multiple selector strategies for each operation
4. **Logging**: Extensive logging at each step to identify issues quickly
5. **Safety Limits**: Max page limit prevents infinite loops
6. **Graceful Degradation**: If total count can't be extracted, scrape until no more pages

### Expected One-Pass Success
With this PRP, an AI agent should successfully implement pagination handling in one pass. The main uncertainty is determining the exact selectors for pagination controls, which is addressed through multiple fallback strategies and clear guidance on using Playwright Inspector. The implementation pattern is straightforward: extract total, loop through pages, collect games, validate count. The existing scraper structure makes it easy to integrate pagination logic without major refactoring.

---

## 12. Additional Resources

### Playwright Documentation Links
- Page Navigation: https://playwright.dev/docs/api/class-page#page-goto
- Locators: https://playwright.dev/docs/locators
- Waiting: https://playwright.dev/docs/api/class-page#page-wait-for-load-state
- Clicking: https://playwright.dev/docs/input#mouse-click
- Text Content: https://playwright.dev/docs/api/class-locator#locator-text-content

### Regex Resources
- Regex for extracting numbers: `/(\d+)\s+(?:de|of)\s+(\d+)/i`
- Test regex patterns: https://regex101.com/

### Similar Implementation Examples
- Bright Data Pagination: https://brightdata.com/blog/web-data/pagination-web-scraping
- Playwright pagination patterns (search results from research)

---

**Generated with Claude Code**
**PRP Version**: 1.0
**Created**: 2025-10-27
**Scope**: Fix scraping strategy to use pagination instead of infinite scroll for both PS Store and Backloggd
