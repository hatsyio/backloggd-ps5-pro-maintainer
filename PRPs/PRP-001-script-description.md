# PRP-001: Backloggd PS5 Pro Maintainer Script

## 1. Project Overview

### Feature Description
Build a TypeScript-based automated script that:
- Scrapes PS5 Pro enhanced games list from PlayStation Store
- Retrieves current list from Backloggd user profile
- Performs **bidirectional comparison** to identify:
  - Games missing from Backloggd (should be added)
  - Games in Backloggd that aren't in PS Store (added by error, should be removed)
- **Logs all changes to console** (no automatic updates for now)

### Source Requirements
- **Feature Document**: features-doc/001-script-description.md
- **PlayStation Store URL**: https://store.playstation.com/es-es/category/1d443305-2dcf-4543-8f7e-8c6ec409ecbf/1
- **Backloggd List URL**: https://backloggd.com/u/Termeni/list/ps5-pro-enhanced-games/

### Key Challenges
- No official APIs for either PlayStation Store or Backloggd
- Both sites rely heavily on dynamic content (JavaScript rendering)
- Authentication NOT required initially (read-only mode for Backloggd)
- Data extraction requires HTML/CSS parsing

### Scope Clarification
**Phase 1 (This PRP)**: Read-only scraping and logging
**Phase 2 (Future)**: Automated updates to Backloggd list

---

## 2. Technical Stack & Dependencies

### Core Technologies
- **Runtime**: Node.js (v20+)
- **Language**: TypeScript 5.x
- **Browser Automation**: Playwright (recommended over Puppeteer for 2025)
- **Environment Management**: dotenv
- **Code Quality**: ESLint (flat config), Prettier

### Project Structure
```
backloggd-ps5-pro-maintainer/
├── src/
│   ├── index.ts                 # Main orchestration script
│   ├── scrapers/
│   │   ├── playstation-store.ts # PS Store scraper
│   │   └── backloggd.ts         # Backloggd scraper (read-only)
│   ├── services/
│   │   ├── comparison.ts        # Bidirectional list comparison
│   │   └── logger.ts            # Logging utility
│   └── types/
│       └── game.ts              # Game interface definitions
├── tests/
│   ├── scrapers/
│   └── services/
├── .env.example                 # Template for environment variables
├── .env                         # Actual secrets (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── eslint.config.js             # Modern ESLint flat config
└── playwright.config.ts
```

---

## 3. External Resources & Documentation

### Essential Documentation
1. **Playwright Official Docs**
   - TypeScript Setup: https://playwright.dev/docs/test-typescript
   - API Reference: https://playwright.dev/docs/api/class-playwright
   - Best Practices: https://blog.apify.com/playwright-web-scraping/

2. **PlayStation Store Scraping**
   - Existing npm package (reference): https://www.npmjs.com/package/psn-store-scraper
   - Alternative implementation: https://github.com/fabriciolak/ps-scraper
   - Note: These packages may be outdated; use as reference for HTML structure

3. **Backloggd Integration**
   - Unofficial API (read-only): https://github.com/Qewertyy/Backloggd-API
   - Note: Public lists can be scraped without authentication

4. **TypeScript Best Practices (2025)**
   - Web Scraping Guide: https://www.zenrows.com/blog/web-scraping-typescript
   - ESLint Flat Config: https://advancedfrontends.com/eslint-flat-config-typescript-javascript/

### Key Libraries & Versions
```json
{
  "dependencies": {
    "playwright": "^1.50.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0",
    "eslint": "^9.17.0",
    "@typescript-eslint/parser": "^8.18.0",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "prettier": "^3.4.0",
    "eslint-plugin-prettier": "^5.2.0",
    "eslint-config-prettier": "^9.1.0",
    "tsx": "^4.19.0"
  }
}
```

---

## 4. Implementation Blueprint

### Phase 1: Project Setup
```typescript
// 1. Initialize npm project
// 2. Install dependencies
// 3. Configure TypeScript with strict mode
// 4. Set up ESLint with flat config
// 5. Configure Playwright
// 6. Create .env.example with required variables
```

**tsconfig.json** (Recommended Settings):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Phase 2: Type Definitions
```typescript
// src/types/game.ts
export interface Game {
  title: string;
  platform: string;
  url?: string;
  id?: string;
  releaseDate?: string;
}

export interface ScraperResult {
  games: Game[];
  timestamp: Date;
  source: 'playstation-store' | 'backloggd';
}

export interface ComparisonResult {
  gamesToAdd: Game[];      // In PS Store but not in Backloggd
  gamesToRemove: Game[];   // In Backloggd but not in PS Store (errors)
  alreadyInSync: Game[];   // Games correctly in both lists
}
```

### Phase 3: PlayStation Store Scraper
```typescript
// src/scrapers/playstation-store.ts

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
    headless: true,
    slowMo: 100 // Prevents aggressive scraping detection
  });

  try {
    const page: Page = await browser.newPage();

    // Set realistic user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    logger.info('Navigating to PlayStation Store...');
    await page.goto(process.env.PS_STORE_URL!, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Handle cookie consent if present
    const cookieButton = await page.$('button[data-qa="accept-cookies"]');
    if (cookieButton) {
      await cookieButton.click();
      await page.waitForTimeout(1000);
    }

    // Scroll to load all games (infinite scroll)
    await autoScroll(page);

    // Extract game data
    // NOTE: These selectors are placeholders - inspect actual PS Store DOM
    const games: Game[] = await page.$$eval('.psw-product-tile', (tiles) => {
      return tiles.map((tile) => ({
        title: tile.querySelector('.psw-t-body')?.textContent?.trim() || '',
        platform: 'PS5 Pro',
        url: tile.querySelector('a')?.href || ''
      }));
    });

    logger.info(`Scraped ${games.length} games from PlayStation Store`);

    return {
      games,
      timestamp: new Date(),
      source: 'playstation-store'
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
        const scrollHeight = document.body.scrollHeight;
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
```

### Phase 4: Backloggd Scraper (Read-Only)
```typescript
// src/scrapers/backloggd.ts

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
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    logger.info('Navigating to Backloggd list...');
    await page.goto(process.env.BACKLOGGD_LIST_URL!, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for list to load
    await page.waitForSelector('.game-cover', { timeout: 10000 });

    // Extract games from list
    // NOTE: These selectors are placeholders - inspect actual Backloggd DOM
    const games: Game[] = await page.$$eval('.game-cover', (items) => {
      return items.map((item) => {
        const link = item.closest('a');
        const title = link?.getAttribute('title') ||
                     item.querySelector('img')?.getAttribute('alt') || '';

        return {
          title: title.trim(),
          platform: 'PS5',
          url: link?.href || undefined,
          id: link?.href?.split('/').pop() || undefined
        };
      });
    });

    logger.info(`Found ${games.length} games in Backloggd list`);

    return {
      games,
      timestamp: new Date(),
      source: 'backloggd'
    };
  } catch (error) {
    logger.error('Backloggd scraping failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}
```

### Phase 5: Bidirectional Comparison Service
```typescript
// src/services/comparison.ts

import { Game, ComparisonResult } from '../types/game';
import { logger } from './logger';

/**
 * Performs bidirectional comparison of game lists
 *
 * Strategy:
 * 1. Normalize titles (lowercase, remove special chars)
 * 2. Find games in PS Store but not in Backloggd (to add)
 * 3. Find games in Backloggd but not in PS Store (errors, to remove)
 * 4. Find games correctly in both lists
 */

export function compareGameLists(
  psStoreGames: Game[],
  backloggdGames: Game[]
): ComparisonResult {

  // Create normalized lookup maps
  const psStoreMap = new Map<string, Game>();
  const backloggdMap = new Map<string, Game>();

  psStoreGames.forEach((game) => {
    psStoreMap.set(normalizeTitle(game.title), game);
  });

  backloggdGames.forEach((game) => {
    backloggdMap.set(normalizeTitle(game.title), game);
  });

  // Find missing games (in PS Store but not in Backloggd)
  const gamesToAdd: Game[] = [];
  psStoreGames.forEach((game) => {
    const normalized = normalizeTitle(game.title);
    if (!backloggdMap.has(normalized)) {
      gamesToAdd.push(game);
    }
  });

  // Find erroneous games (in Backloggd but not in PS Store)
  const gamesToRemove: Game[] = [];
  backloggdGames.forEach((game) => {
    const normalized = normalizeTitle(game.title);
    if (!psStoreMap.has(normalized)) {
      gamesToRemove.push(game);
    }
  });

  // Find correctly synced games
  const alreadyInSync: Game[] = [];
  psStoreGames.forEach((game) => {
    const normalized = normalizeTitle(game.title);
    if (backloggdMap.has(normalized)) {
      alreadyInSync.push(game);
    }
  });

  logger.info(`Comparison complete: ${gamesToAdd.length} to add, ${gamesToRemove.length} to remove, ${alreadyInSync.length} in sync`);

  return {
    gamesToAdd,
    gamesToRemove,
    alreadyInSync
  };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces for better matching
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Optional: Implement fuzzy matching for cases where titles differ slightly
 * Consider using libraries like 'fuzzball' or 'string-similarity' if needed
 */
```

### Phase 6: Logging Service
```typescript
// src/services/logger.ts

/**
 * Enhanced logger for tracking script execution
 */

import { Game } from '../types/game';

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },

  success: (message: string) => {
    console.log(`✓ [SUCCESS] ${new Date().toISOString()} - ${message}`);
  },

  warn: (message: string) => {
    console.warn(`⚠ [WARN] ${new Date().toISOString()} - ${message}`);
  },

  /**
   * Logs comparison results in a formatted, readable way
   */
  logComparisonResults: (result: {
    gamesToAdd: Game[];
    gamesToRemove: Game[];
    alreadyInSync: Game[];
  }) => {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPARISON RESULTS');
    console.log('='.repeat(80) + '\n');

    // Games to add
    if (result.gamesToAdd.length > 0) {
      console.log(`\n✅ GAMES TO ADD (${result.gamesToAdd.length}):`);
      console.log('-'.repeat(80));
      result.gamesToAdd.forEach((game, index) => {
        console.log(`${index + 1}. ${game.title}`);
        if (game.url) console.log(`   URL: ${game.url}`);
      });
    } else {
      console.log('\n✅ No games need to be added - list is complete!');
    }

    // Games to remove
    if (result.gamesToRemove.length > 0) {
      console.log(`\n❌ GAMES TO REMOVE (${result.gamesToRemove.length}):`);
      console.log('-'.repeat(80));
      result.gamesToRemove.forEach((game, index) => {
        console.log(`${index + 1}. ${game.title}`);
        if (game.url) console.log(`   URL: ${game.url}`);
      });
    } else {
      console.log('\n✅ No erroneous games found - list is accurate!');
    }

    // Already in sync
    console.log(`\n✓ Already in sync: ${result.alreadyInSync.length} games`);

    console.log('\n' + '='.repeat(80) + '\n');
  }
};
```

### Phase 7: Main Orchestration
```typescript
// src/index.ts

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
    logger.success(`Scraped ${psStoreResult.games.length} games from PlayStation Store\n`);

    // Step 2: Scrape Backloggd list
    logger.info('📥 Step 2: Scraping Backloggd list');
    const backloggdResult = await scrapeBackloggdList();
    logger.success(`Scraped ${backloggdResult.games.length} games from Backloggd\n`);

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
```

---

## 5. Environment Configuration

### .env.example
```bash
# PlayStation Store
PS_STORE_URL=https://store.playstation.com/es-es/category/1d443305-2dcf-4543-8f7e-8c6ec409ecbf/1

# Backloggd
BACKLOGGD_LIST_URL=https://backloggd.com/u/Termeni/list/ps5-pro-enhanced-games/

# Configuration
HEADLESS_MODE=true
```

### .gitignore
```
node_modules/
dist/
.env
*.log
coverage/
.DS_Store
```

---

## 6. Task Breakdown (Ordered Implementation)

1. **Initialize Project Structure**
   - Create directory structure (src/, src/scrapers/, src/services/, src/types/)
   - Initialize npm with `npm init`
   - Install all dependencies

2. **Configure TypeScript**
   - Create tsconfig.json with strict mode
   - Configure paths and module resolution

3. **Set Up Code Quality Tools**
   - Configure ESLint with flat config (eslint.config.js)
   - Add Prettier configuration (.prettierrc)
   - Add npm scripts for linting

4. **Configure Playwright**
   - Create playwright.config.ts
   - Install browser binaries: `npx playwright install chromium`

5. **Implement Type Definitions**
   - Create src/types/game.ts with Game, ScraperResult, and ComparisonResult interfaces

6. **Build Logger Service**
   - Implement src/services/logger.ts with formatted output
   - Add logComparisonResults method for pretty printing

7. **Implement PlayStation Store Scraper**
   - Create src/scrapers/playstation-store.ts
   - Implement browser launch and navigation
   - Add auto-scroll functionality for infinite scroll
   - Extract game data from DOM (inspect actual selectors first)
   - Add error handling

8. **Implement Backloggd Scraper**
   - Create src/scrapers/backloggd.ts (read-only)
   - Navigate to public list URL
   - Extract game titles and URLs
   - Add error handling

9. **Build Bidirectional Comparison Service**
   - Create src/services/comparison.ts
   - Implement normalizeTitle function
   - Implement compareGameLists for bidirectional comparison
   - Return gamesToAdd, gamesToRemove, and alreadyInSync

10. **Create Main Orchestration Script**
    - Implement src/index.ts
    - Wire all components together
    - Add comprehensive error handling
    - Add formatted console output

11. **Environment Setup**
    - Create .env.example with all required variables
    - Create .env with actual values
    - Document each variable's purpose

12. **Add Build Scripts**
    - Add build, dev, lint, type-check scripts to package.json
    - Add format script for Prettier

13. **Test Scrapers Individually**
    - Test PS Store scraper with real URL
    - Test Backloggd scraper with real URL
    - Verify data extraction accuracy

14. **Test End-to-End**
    - Run full script with `npm run dev`
    - Verify console output formatting
    - Test with different list states (empty, partial, full)

15. **Documentation**
    - Update README.md with setup and usage instructions
    - Document expected output format

---

## 7. Validation Gates (Executable)

### TypeScript Compilation
```bash
npm run build
# Expected: Compiles successfully to dist/ folder
# No TypeScript errors should appear
```

### Type Checking
```bash
npm run type-check
# Expected: "Found 0 errors"
```

### Linting & Formatting
```bash
npm run lint
# Expected: No linting errors

npm run lint:fix
# Expected: Auto-fixes all fixable issues
```

### Runtime Execution
```bash
npm run dev
# Expected output format:
# [INFO] Starting Backloggd PS5 Pro Maintainer...
# [INFO] Step 1: Scraping PlayStation Store
# [SUCCESS] Scraped X games from PlayStation Store
# [INFO] Step 2: Scraping Backloggd list
# [SUCCESS] Scraped Y games from Backloggd
# [INFO] Step 3: Performing bidirectional comparison
# ================================================================================
# 📊 COMPARISON RESULTS
# ================================================================================
#
# ✅ GAMES TO ADD (N):
# --------------------------------------------------------------------------------
# 1. Game Title 1
#    URL: https://...
#
# ❌ GAMES TO REMOVE (M):
# --------------------------------------------------------------------------------
# 1. Game Title 2
#    URL: https://...
#
# ✓ Already in sync: K games
# ================================================================================
```

### Integration Test Checklist
```bash
# Manual verification:
# 1. PS Store scraper returns non-empty games array
# 2. Backloggd scraper returns non-empty games array
# 3. Comparison correctly identifies missing games
# 4. Comparison correctly identifies erroneous games
# 5. Console output is readable and well-formatted
# 6. Script exits with code 0 on success
```

---

## 8. Gotchas & Best Practices

### Critical Gotchas

1. **PlayStation Store Dynamic Loading**
   - Games load incrementally via infinite scroll
   - Must wait for `networkidle` and implement auto-scroll
   - Selectors may change; **inspect actual DOM before implementation**
   - Use Playwright's page.pause() during development to inspect selectors

2. **Backloggd Public List Structure**
   - No authentication needed for public lists
   - Game titles may be in image alt tags or link titles
   - **Inspect actual Backloggd HTML** to find correct selectors
   - List might paginate; check if scrolling/clicking "load more" is needed

3. **Title Matching Challenges**
   - Game titles may differ slightly between sites (e.g., "Final Fantasy VII Remake" vs "FFVII Remake")
   - Current normalization removes punctuation and spaces
   - May need fuzzy matching for edge cases (consider `string-similarity` library)
   - Test with known problematic titles (special characters, different editions)

4. **Rate Limiting**
   - Both sites may detect aggressive scraping
   - Add delays between actions (already included via `slowMo: 100`)
   - Use realistic user agents (already included)
   - Consider running during off-peak hours

5. **Network Failures**
   - Timeout errors are common with slow connections
   - Already set to 60s timeout; may need adjustment
   - Implement retry logic in future iterations

### Best Practices

1. **Selector Strategy**
   - Start with most specific selectors (data attributes, IDs)
   - Have fallback selectors in case of changes
   - **Document which elements are being targeted** with comments
   - Use Playwright Inspector: `PWDEBUG=1 npm run dev`

2. **Development Workflow**
   - Use headless: false during development to see what's happening
   - Add page.pause() to inspect page state
   - Take screenshots on errors: `await page.screenshot({ path: 'error.png' })`
   - Log intermediate results to verify data extraction

3. **Error Handling**
   - Wrap each scraper in try-catch
   - Log detailed error information
   - Take screenshots on scraping failures
   - Continue execution if one scraper fails (in future iterations)

4. **Title Normalization**
   - Current approach: lowercase + remove special chars + normalize spaces
   - May need refinement based on real data
   - Consider logging normalized titles during development
   - Add test cases for edge cases

5. **Performance**
   - Parallel scraping could be implemented (both scrapers run simultaneously)
   - Reuse browser context if scraping multiple pages
   - Consider caching results for development/testing

---

## 9. Package.json Scripts

```json
{
  "name": "backloggd-ps5-pro-maintainer",
  "version": "1.0.0",
  "description": "Automated script to sync PS5 Pro enhanced games between PlayStation Store and Backloggd",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "clean": "rm -rf dist",
    "debug": "PWDEBUG=1 tsx src/index.ts"
  },
  "keywords": ["backloggd", "ps5", "playstation", "scraper"],
  "author": "",
  "license": "MIT"
}
```

---

## 10. Example Output Format

```
[INFO] 2025-01-27T10:30:00.000Z - 🚀 Starting Backloggd PS5 Pro Maintainer...

[INFO] 2025-01-27T10:30:00.500Z - 📥 Step 1: Scraping PlayStation Store
[INFO] 2025-01-27T10:30:01.000Z - Navigating to PlayStation Store...
✓ [SUCCESS] 2025-01-27T10:30:15.234Z - Scraped 42 games from PlayStation Store

[INFO] 2025-01-27T10:30:15.500Z - 📥 Step 2: Scraping Backloggd list
[INFO] 2025-01-27T10:30:16.000Z - Navigating to Backloggd list...
✓ [SUCCESS] 2025-01-27T10:30:20.123Z - Scraped 38 games from Backloggd

[INFO] 2025-01-27T10:30:20.500Z - 🔍 Step 3: Performing bidirectional comparison
[INFO] 2025-01-27T10:30:20.600Z - Comparison complete: 5 to add, 1 to remove, 37 in sync

================================================================================
📊 COMPARISON RESULTS
================================================================================

✅ GAMES TO ADD (5):
--------------------------------------------------------------------------------
1. Spider-Man 2
   URL: https://store.playstation.com/...
2. Horizon Forbidden West
   URL: https://store.playstation.com/...
3. Ratchet & Clank: Rift Apart
   URL: https://store.playstation.com/...
4. Gran Turismo 7
   URL: https://store.playstation.com/...
5. The Last of Us Part II
   URL: https://store.playstation.com/...

❌ GAMES TO REMOVE (1):
--------------------------------------------------------------------------------
1. Test Game That Doesn't Exist
   URL: https://backloggd.com/games/...

✓ Already in sync: 37 games

================================================================================

⚠ [WARN] 2025-01-27T10:30:20.700Z - ⚠️  List requires updates (see above for details)
```

---

## 11. Quality Checklist

- [x] All necessary context included (URLs, packages, patterns)
- [x] Validation gates are executable and specific
- [x] References existing scraping patterns and libraries
- [x] Clear implementation path with pseudocode
- [x] Error handling documented (network, parsing)
- [x] Gotchas identified with solutions
- [x] External documentation URLs provided
- [x] TypeScript types defined (including ComparisonResult)
- [x] Environment variables documented
- [x] Ordered task breakdown provided
- [x] Modern 2025 best practices (Playwright, ESLint flat config)
- [x] Bidirectional comparison logic included
- [x] Log-only mode (no update functionality)
- [x] Example output format provided

---

## 12. Confidence Score

**Score: 9/10**

### Strengths
- Comprehensive research on modern TypeScript web scraping
- Detailed pseudocode with real-world patterns
- Simplified scope (read-only, log-only) reduces complexity
- Bidirectional comparison logic clearly defined
- Executable validation gates provided
- References to existing libraries and documentation
- Clear example output format

### Uncertainties
- Exact HTML selectors for both sites (require runtime inspection)
  - **Mitigation**: Use Playwright Inspector during development
- Potential pagination on Backloggd lists (depends on list size)
  - **Mitigation**: Test with actual URL and adjust if needed
- Minor title variations between platforms
  - **Mitigation**: Normalization strategy provided, can refine later

### Risk Mitigation Strategies
1. **Selector Discovery**: Use `PWDEBUG=1` mode to inspect pages interactively
2. **Incremental Testing**: Test each scraper independently before integration
3. **Logging**: Verbose logging helps identify issues quickly
4. **Headless Mode Toggle**: Easy to switch for debugging

### Expected One-Pass Success
With this PRP, an AI agent should successfully implement the core functionality in one pass. The architecture is straightforward (three independent scrapers + comparison + logging), error handling is clear, and the read-only scope eliminates authentication complexity. The main uncertainty is DOM selectors, which can be quickly resolved by inspecting the actual HTML during implementation.

---

## 13. Future Enhancements (Phase 2+)

1. **Automated Updates**
   - Implement Backloggd authentication (cookie-based or automated login)
   - Add function to automatically add/remove games
   - Handle CSRF tokens and session management

2. **Notifications**
   - Email notifications on changes detected
   - Discord webhook integration
   - Slack integration

3. **Scheduling**
   - GitHub Actions workflow to run daily
   - Cron job setup instructions

4. **Data Persistence**
   - Store historical comparison results
   - Track when games were added/removed
   - SQLite database for trend analysis

5. **Fuzzy Matching**
   - Implement Levenshtein distance for better title matching
   - Handle different editions (Standard, Deluxe, etc.)
   - Manual override configuration file

6. **Multi-Region Support**
   - Scrape multiple PS Store regions
   - Combine results from different storefronts

7. **Testing**
   - Unit tests for comparison logic
   - Integration tests with mocked pages
   - Playwright test framework

---

**Generated with Claude Code**
**PRP Version**: 1.0 (Revised)
**Created**: 2025-01-27
**Scope**: Read-only scraping with bidirectional comparison and logging
