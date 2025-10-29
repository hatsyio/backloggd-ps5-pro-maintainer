# PRP-005: Add Images to Twitter Posts

## 1. Project Overview

### Feature Description
Add game images to Twitter posts about new PS5 Pro enhanced games. When the script detects new games to announce on Twitter, it should fetch the game's cover/hero image from the PlayStation Store and attach it to the tweet for better engagement and visual appeal.

### Source Requirements
- **Feature Document**: features-doc/005-add-image-twitter.md
- **Files to Modify**:
  - `src/services/twitter.ts` (add image fetching and upload)
  - `src/types/notifications.ts` (add image-related types)
- **Files to Reference**:
  - `src/scrapers/playstation-store.ts` (existing Playwright patterns)
  - `src/types/game.ts` (Game interface with URL)

### Current Behavior
The Twitter service currently posts text-only tweets with game titles, hashtags, and URLs (src/services/twitter.ts:100-120). No images are attached to tweets.

**Current tweet format:**
```
🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

#PS5Pro #PlayStation #Gaming
https://store.playstation.com/es-es/concept/...
```

### Desired Outcome
1. For each game to tweet about, visit the game's PS Store page
2. Extract the primary game image (cover/hero image)
3. Download the image to a buffer
4. Upload the image to Twitter using v1.1 media API
5. Attach the media_id to the tweet
6. Result: Tweets with eye-catching game images

**Enhanced tweet format:**
```
🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

#PS5Pro #PlayStation #Gaming
https://store.playstation.com/es-es/concept/...
[GAME COVER IMAGE ATTACHED]
```

---

## 2. Technical Context

### Current Implementation Analysis

**Twitter Service** (`src/services/twitter.ts`):
- Lines 1-143: Complete Twitter service implementation
- Lines 36-95: `postNewGameTweets()` - Main method for posting tweets
- Lines 97-120: `formatGameTweet()` - Text formatting (max 280 chars)
- Line 71: `await this.client.v2.tweet(tweetText)` - Tweet posting (text only)
- **Key Insight**: Need to add image fetching before line 71, upload to v1 API, then pass media_ids to v2 tweet

**Game Type** (`src/types/game.ts`):
- Lines 1-7: Game interface with `url?: string` field
- **Key Insight**: Game.url contains the PS Store game page URL for image scraping

**PlayStation Store Scraper** (`src/scrapers/playstation-store.ts`):
- Lines 20-193: Complete scraper with Playwright
- Lines 26-29: Browser launch with headless mode
- Lines 35-37: User-Agent headers for realistic requests
- Lines 40-43: Page navigation with timeout
- Lines 49-60: Cookie consent handling
- **Key Insight**: Follow same patterns for image scraping (browser launch, headers, waits)

**Notification Types** (`src/types/notifications.ts`):
- Lines 1-45: Existing notification type definitions
- **Key Insight**: May need to add types for image fetching results

### Dependencies Analysis

**Current Dependencies** (`package.json`):
- `playwright`: ^1.56.1 (already installed - can be used for image scraping)
- `twitter-api-v2`: ^1.17.3 (already installed - supports v1.uploadMedia)
- `dotenv`: ^16.6.1 (environment variables)
- TypeScript: ^5.9.3 (type safety)

**No New Dependencies Needed** ✓

**Playwright** is already available and can:
- Navigate to game pages
- Wait for images to load
- Extract image URLs via selectors

**twitter-api-v2** already includes:
- `client.v1.uploadMedia()` for uploading images
- Supports Buffer input: `uploadMedia(Buffer, { type: 'png' })`
- Returns media_id string for attaching to tweets

### PS Store Game Page Structure

Based on codebase exploration and debug screenshots:

**Game Page URL Pattern:**
```
https://store.playstation.com/{region}/concept/{concept-id}
Example: https://store.playstation.com/es-es/concept/10000291
```

**Image Selectors to Try (in priority order):**
1. `img[alt*="screenshot" i]` - Screenshot images (case-insensitive)
2. `picture img` - Modern picture element approach
3. `div.media img` - Images in media container
4. `section[aria-label*="Media" i] img` - Images in media section
5. First high-resolution `img` with src starting with `https://`

**Image Characteristics:**
- Likely lazy-loaded (need explicit wait)
- URLs may be absolute or relative
- Likely served from CDN with quality/size parameters
- Common formats: JPG, PNG, WebP

---

## 3. External Resources & Documentation

### Twitter API v1.1 - Media Upload

**Official Documentation**:
- Media Upload API: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-upload
- Media Upload Guide: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/overview

**Key Information**:
- **Endpoint**: `POST https://upload.twitter.com/1.1/media/upload.json`
- **Authentication**: Uses same credentials as v2 API (app + access tokens)
- **Parameters**: `media_data` (base64) or `media` (binary), optional `media_category`
- **Response**: Returns `media_id_string` to attach to tweets
- **Expiration**: Media IDs expire after `expires_after_secs` (typically 86400s = 24h)
- **File Size**: Check official limits (typically 5MB for images)
- **Formats**: JPG, PNG, GIF, WebP

### twitter-api-v2 NPM Package - Media Upload

**Documentation**:
- GitHub Examples: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/examples.md
- v1 API Docs: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v1.md

**Usage Examples**:
```typescript
// From file path
const mediaId = await client.v1.uploadMedia('./image.jpg');

// From Buffer (our use case)
const imageBuffer = Buffer.from(imageData);
const mediaId = await client.v1.uploadMedia(imageBuffer, { type: 'jpg' });

// Tweet with media
await client.v2.tweet({
  text: 'Tweet text',
  media: { media_ids: [mediaId] }
});
```

**Key Features**:
- Automatic chunked upload for large files
- Concurrent upload support
- Automatic media type detection
- Full TypeScript support

### Playwright - Image Extraction

**Official Documentation**:
- Screenshots API: https://playwright.dev/docs/screenshots
- Selectors: https://playwright.dev/docs/selectors
- Network: https://playwright.dev/docs/network

**Approaches for Getting Image Data**:

1. **Extract URL then fetch with HTTP client** (Recommended):
   ```typescript
   const imageSrc = await page.$eval('img', img => img.src);
   const response = await fetch(imageSrc);
   const buffer = Buffer.from(await response.arrayBuffer());
   ```

2. **Intercept network responses** (Advanced):
   ```typescript
   page.on('response', async response => {
     if (response.url().includes('image')) {
       const buffer = await response.body();
     }
   });
   ```

3. **Screenshot element** (Fallback):
   ```typescript
   const element = await page.$('img.game-cover');
   const buffer = await element.screenshot();
   ```

**Recommended Approach**: Extract URL + fetch (simple, reliable, reuses existing patterns)

### Node.js - Image Fetching

**Built-in fetch API** (Node.js 18+):
```typescript
const response = await fetch(imageUrl);
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
```

**No additional dependencies needed** - Node.js built-in fetch is sufficient

---

## 4. Implementation Blueprint

### Recommended Approach: Extend Twitter Service with Image Pipeline

After analyzing the codebase and requirements, the **service extension approach** is recommended:

1. **Add Image Fetching Helper**: New method in TwitterService to scrape images from PS Store
2. **Add Image Download Helper**: Fetch image URL and convert to Buffer
3. **Integrate into Tweet Flow**: Modify `postNewGameTweets` to fetch → upload → attach
4. **Add Error Handling**: Graceful fallback to text-only tweets if image fails
5. **Add Caching**: Optional browser reuse to avoid repeated launches

This approach provides:
- **Minimal Changes**: Extends existing TwitterService without major refactoring
- **Backward Compatibility**: Falls back to text-only if images fail
- **Testability**: Image fetching can be mocked/disabled via dry-run
- **Type Safety**: Full TypeScript support throughout
- **Performance**: Reuses Playwright browser instance

### Architecture Overview

```
TwitterService.postNewGameTweets()
  ↓
For each game:
  1. fetchGameImage(game.url) → returns Buffer or null
     ├─ Launch/reuse Playwright browser
     ├─ Navigate to game.url
     ├─ Wait for image to load
     ├─ Extract image src URL
     └─ Download image to Buffer

  2. uploadImageToTwitter(imageBuffer) → returns media_id or null
     └─ client.v1.uploadMedia(buffer, { type })

  3. formatGameTweet(game) → returns text
     └─ Existing method (no changes)

  4. Post tweet with media
     └─ client.v2.tweet({ text, media: { media_ids: [mediaId] } })
```

### Phase 1: Add Helper Types (if needed)

```typescript
// src/types/notifications.ts

/**
 * Result of fetching a game image
 */
export interface ImageFetchResult {
  buffer: Buffer | null;
  url?: string;
  error?: string;
  mimeType?: string; // 'image/jpeg', 'image/png', 'image/webp'
}
```

### Phase 2: Extend Twitter Service - Image Fetching

```typescript
// src/services/twitter.ts
// Add imports at top
import { chromium, Browser } from 'playwright';

class TwitterService {
  private client: TwitterApi | null = null;
  private config: TwitterConfig;
  private browser: Browser | null = null; // Add browser instance

  // ... existing constructor and methods ...

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
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          timeout: 30000,
        });
      }

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

      // Extract primary image URL - try multiple strategies
      let imageUrl: string | null = null;

      // Strategy 1: Look for high-res images from PlayStation CDN
      imageUrl = await page.$eval(
        'img[src*="image.api.playstation.com"]',
        (img) => (img as HTMLImageElement).src
      ).catch(() => null);

      // Strategy 2: Fallback to any large image
      if (!imageUrl) {
        imageUrl = await page.$eval(
          'img[width], img[height]',
          (img) => {
            const width = parseInt((img as HTMLImageElement).width?.toString() || '0');
            const height = parseInt((img as HTMLImageElement).height?.toString() || '0');
            if (width > 300 || height > 300) {
              return (img as HTMLImageElement).src;
            }
            return null;
          }
        ).catch(() => null);
      }

      // Strategy 3: First img with https URL
      if (!imageUrl) {
        imageUrl = await page.$eval(
          'img[src^="https://"]',
          (img) => (img as HTMLImageElement).src
        ).catch(() => null);
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
      let imageType: 'jpg' | 'png' | 'gif' | 'webp' = 'jpg';
      if (imageUrl.includes('.png')) imageType = 'png';
      else if (imageUrl.includes('.gif')) imageType = 'gif';
      else if (imageUrl.includes('.webp')) imageType = 'webp';

      logger.info(`Uploading image to Twitter (${imageBuffer.length} bytes, type: ${imageType})`);

      // Upload using v1 API
      const mediaId = await this.client.v1.uploadMedia(imageBuffer, {
        mimeType: `image/${imageType}`,
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
```

### Phase 3: Integrate Image Pipeline into Tweet Flow

```typescript
// src/services/twitter.ts
// Modify postNewGameTweets method

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

      // NEW: Fetch and upload image
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
```

### Phase 4: Update Service Cleanup (Optional)

If the notification manager needs to cleanup services:

```typescript
// src/services/notifications.ts
// Add cleanup in sendNotifications after twitter operations

async sendNotifications(result: ComparisonResult): Promise<NotificationResult[]> {
  logger.info('📢 Starting notification process...');

  const results: NotificationResult[] = [];
  const hasChanges = result.gamesToAdd.length > 0 || result.gamesToRemove.length > 0;

  // ... existing Telegram code ...

  // Send Twitter posts (only if there are games to add)
  if (hasChanges && result.gamesToAdd.length > 0) {
    try {
      const twitterResult = await this.twitter.postNewGameTweets(
        result.gamesToAdd,
        this.config.dryRun
      );
      results.push(twitterResult);

      // NEW: Cleanup browser resources
      await this.twitter.cleanup();
    } catch (error) {
      logger.error('Twitter notification failed', error);
      results.push({
        service: 'twitter',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else if (result.gamesToAdd.length === 0) {
    logger.info('No new games to announce on Twitter');
  }

  // ... rest of method ...
}
```

---

## 5. Task Breakdown (Ordered Implementation)

1. **Read and Understand Existing Code**
   - Read: `src/services/twitter.ts` (understand current flow)
   - Read: `src/scrapers/playstation-store.ts` (understand Playwright patterns)
   - Identify integration points in `postNewGameTweets` method

2. **Add Image Fetching Helper Method**
   - Open: `src/services/twitter.ts`
   - Add import: `import { chromium, Browser } from 'playwright';`
   - Add private property: `private browser: Browser | null = null;`
   - Add method: `private async fetchGameImage(gameUrl: string | undefined): Promise<Buffer | null>`
   - Implement browser launch/reuse logic
   - Implement page navigation to game URL
   - Implement image selector strategies (3 fallback strategies)
   - Handle errors and return null on failure
   - Test with dry-run logging

3. **Add Image Download Helper Method**
   - Open: `src/services/twitter.ts`
   - Add method: `private async downloadImageToBuffer(imageUrl: string): Promise<Buffer | null>`
   - Use Node.js fetch API to download image
   - Convert response to Buffer
   - Handle HTTP errors gracefully
   - Test with known image URLs

4. **Add Image Upload Helper Method**
   - Open: `src/services/twitter.ts`
   - Add method: `private async uploadImageToTwitter(imageBuffer: Buffer, imageUrl: string): Promise<string | null>`
   - Detect image type from URL extension
   - Call `this.client.v1.uploadMedia(imageBuffer, { mimeType })`
   - Return media_id string or null on failure
   - Add logging for success/failure
   - Test with dry-run mode

5. **Add Browser Cleanup Method**
   - Open: `src/services/twitter.ts`
   - Add method: `async cleanup(): Promise<void>`
   - Close browser if open: `await this.browser.close()`
   - Set browser to null
   - Add logging

6. **Integrate Image Pipeline into Tweet Flow**
   - Open: `src/services/twitter.ts`
   - Modify: `postNewGameTweets` method
   - Before tweet posting, add:
     - Call `fetchGameImage(game.url)` → get Buffer
     - If buffer exists, call `uploadImageToTwitter(buffer, url)` → get media_id
     - If media_id exists, add to tweet payload: `{ media: { media_ids: [mediaId] } }`
   - Update logging to indicate image status
   - Add cleanup call after loop: `await this.cleanup()`
   - Increase rate limit delay from 1s to 2s (for image processing time)

7. **Update Dry-Run Mode**
   - Open: `src/services/twitter.ts`
   - In `postNewGameTweets`, dry-run branch:
   - Add log: `[DRY RUN] Would fetch image from: ${game.url || 'N/A'}`
   - Verify dry-run doesn't actually fetch images

8. **Optional: Add Cleanup to Notification Manager**
   - Open: `src/services/notifications.ts`
   - After twitter operations in `sendNotifications`:
   - Add: `await this.twitter.cleanup()` (only if TwitterService is modified to be non-static)
   - Note: Current implementation uses class instances, cleanup is already called in postNewGameTweets

9. **Test with Type Checking**
   - Run: `npm run type-check`
   - Expected: No TypeScript errors
   - Fix any type issues

10. **Test with Linting**
    - Run: `npm run lint:fix`
    - Expected: Auto-fix minor issues
    - Verify no linting errors remain

11. **Test Build**
    - Run: `npm run build`
    - Expected: Compiles to dist/ successfully
    - Verify no compilation errors

12. **Test with Dry Run**
    - Set in .env: `NOTIFICATIONS_DRY_RUN=true`, `TWITTER_ENABLED=true`
    - Run: `npm run dev`
    - Expected: Logs show "[DRY RUN] Would fetch image from: ..."
    - Expected: No actual image fetching or uploading occurs

13. **Test with Real Credentials**
    - Set in .env: `NOTIFICATIONS_DRY_RUN=false`, with real Twitter credentials
    - Run: `npm run dev`
    - Expected: Fetches images from PS Store
    - Expected: Uploads images to Twitter
    - Expected: Tweets posted with images attached
    - Verify on Twitter: Check that tweets have images

14. **Test Error Scenarios**
    - Test with invalid game URL (should fallback to text-only)
    - Test with unreachable image URL (should fallback to text-only)
    - Test with no game.url (should fallback to text-only)
    - Verify script continues and doesn't crash

---

## 6. Code Reference Points

### Key Files and Lines

**Twitter Service** (`src/services/twitter.ts`):
- Line 1: Add Playwright imports: `import { chromium, Browser } from 'playwright';`
- Line 12: Add browser property: `private browser: Browser | null = null;`
- Lines 36-95: `postNewGameTweets()` - Main integration point
- Line 61-68: Dry-run branch - Add image fetch logging
- Line 70-71: Tweet posting - Modify to include media
- After line 95: Add new helper methods (fetchGameImage, downloadImageToBuffer, uploadImageToTwitter, cleanup)

**Game Type** (`src/types/game.ts`):
- Lines 1-7: Game interface with `url?: string` - Used for image fetching

**PlayStation Store Scraper** (`src/scrapers/playstation-store.ts`):
- Lines 26-29: Browser launch pattern - Mirror this
- Lines 35-37: User-Agent headers - Copy this
- Lines 49-60: Cookie handling - May need this
- Lines 66-75: Selector wait strategies - Copy this pattern

**Notification Manager** (`src/services/notifications.ts`):
- Lines 604-621: Twitter notification block - May add cleanup call here

### Patterns to Follow

**Existing Code Patterns**:

1. **Browser Launch** (playstation-store.ts:26-29):
   ```typescript
   const browser: Browser = await chromium.launch({
     headless: process.env.HEADLESS_MODE !== 'false',
     slowMo: 100,
   });
   ```

2. **User-Agent Headers** (playstation-store.ts:35-37):
   ```typescript
   await page.setExtraHTTPHeaders({
     'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
   });
   ```

3. **Selector Wait with Fallback** (playstation-store.ts:66-75):
   ```typescript
   try {
     await page.waitForSelector('[data-qa^="search#product"]', {
       timeout: 10000,
     });
   } catch {
     logger.warn('Could not find selector, trying alternative...');
     await page.waitForTimeout(5000);
   }
   ```

4. **Error Handling with Graceful Degradation**:
   ```typescript
   try {
     // operation
     logger.info('Success message');
   } catch (error) {
     logger.error('Error message', error);
     return null; // Allow continuation
   }
   ```

5. **Logging Style** (logger.ts):
   ```typescript
   logger.info('📱 Starting process...');
   logger.success('✅ Operation completed');
   logger.warn('⚠️ Fallback used');
   logger.error('Error message', errorObject);
   ```

---

## 7. Validation Gates (Executable)

### Type Checking
```bash
npm run type-check
# Expected: "Found 0 errors"
# Verifies: Buffer types, async methods, Playwright imports, TwitterApi types
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
# Expected: Compiles successfully to dist/
# Verifies: All imports resolve, no TypeScript errors
```

### Runtime - Dry Run Mode
```bash
# Set in .env:
# TWITTER_ENABLED=true
# NOTIFICATIONS_DRY_RUN=true

npm run dev

# Expected output:
# [INFO] ... - 🐦 Twitter service initialized
# [INFO] ... - Fetching image for "{game title}"...
# [INFO] ... - 🔍 [DRY RUN] Would post tweet:
# [INFO] ... - {tweet text}
# [INFO] ... - [DRY RUN] Would fetch image from: https://store.playstation.com/...
# (No actual image fetching or browser launch)
```

### Runtime - Real Execution (With Images)
```bash
# Set in .env:
# TWITTER_ENABLED=true
# NOTIFICATIONS_DRY_RUN=false
# {Twitter credentials set}

npm run dev

# Expected output:
# [INFO] ... - 🐦 Twitter service initialized
# [INFO] ... - Fetching image for "{game title}"...
# [INFO] ... - Fetching image from: https://store.playstation.com/...
# [INFO] ... - Downloading image: https://image.api.playstation.com/...
# [SUCCESS] ... - Image fetched successfully (123456 bytes)
# [INFO] ... - Uploading image to Twitter (123456 bytes, type: jpg)
# [SUCCESS] ... - Image uploaded to Twitter (media_id: 1234567890)
# [INFO] ... - Tweet will include image
# [SUCCESS] ... - 🐦 Tweet posted for "{game title}" (ID: 9876543210) with image
# [INFO] ... - Browser instance closed
# [INFO] ... - Twitter: 3/3 tweets posted successfully
```

### Manual Verification Checklist
- [ ] TypeScript compiles without errors
- [ ] Linting passes
- [ ] Dry-run mode logs image fetch intent without actually fetching
- [ ] Real mode launches browser and navigates to game pages
- [ ] Images are successfully extracted from PS Store pages
- [ ] Images are downloaded to Buffer
- [ ] Images are uploaded to Twitter v1 API
- [ ] media_ids are attached to v2 tweets
- [ ] Tweets on Twitter have images attached
- [ ] Browser cleanup happens after all tweets
- [ ] Fallback to text-only tweets works when image fetch fails
- [ ] Script doesn't crash if image operations fail
- [ ] Rate limiting works (2 seconds between tweets)

### Test Scenarios

**Scenario 1: Successful Image Fetch and Tweet**
```bash
# When: Game has valid URL and image is available
npm run dev

# Expected:
# - Image fetched from PS Store
# - Image uploaded to Twitter
# - Tweet posted with image
# - Check Twitter: Tweet has game cover image
```

**Scenario 2: Fallback to Text-Only (No Image Found)**
```bash
# When: Game page has no suitable images
npm run dev

# Expected:
# - Warning logged: "No suitable image found on page"
# - Tweet posted without image (text-only)
# - Script continues successfully
```

**Scenario 3: Fallback to Text-Only (No Game URL)**
```bash
# When: Game object has no URL field
npm run dev

# Expected:
# - Warning logged: "No URL for {game}, posting text-only tweet"
# - Tweet posted without image
# - Script continues successfully
```

**Scenario 4: Multiple Games (Browser Reuse)**
```bash
# When: Multiple games to tweet about
npm run dev

# Expected:
# - Browser launched once
# - Multiple images fetched (reusing same browser)
# - Multiple tweets posted with images
# - Browser closed after last game
# - 2 second delay between tweets
```

**Scenario 5: Image Upload Failure**
```bash
# When: Twitter API rejects image upload
npm run dev

# Expected:
# - Error logged: "Failed to upload image to Twitter"
# - Fallback to text-only tweet
# - Script continues successfully
```

---

## 8. Gotchas & Best Practices

### Critical Gotchas

1. **PlayStation Store Dynamic Content**
   - **Issue**: PS Store uses React/SPA; images lazy-load
   - **Symptom**: Selector finds no images because they haven't rendered yet
   - **Solution**: Use `waitForSelector` with specific image selectors
   - **Mitigation**: Multiple fallback selectors with try-catch
   - **Code**:
     ```typescript
     await page.waitForSelector('img[src*="image.api.playstation.com"]', { timeout: 10000 });
     ```

2. **Twitter API v1.1 vs v2**
   - **Issue**: v2 API doesn't support media upload yet
   - **Symptom**: Can't find upload method in v2 client
   - **Solution**: Use `client.v1.uploadMedia()` for upload, then `client.v2.tweet()` with media_ids
   - **Why**: Must combine both API versions
   - **Code**:
     ```typescript
     const mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
     await client.v2.tweet({ text, media: { media_ids: [mediaId] } });
     ```

3. **Media ID Expiration**
   - **Issue**: Twitter media_ids expire after ~24 hours
   - **Symptom**: Old media_ids fail when used in tweets
   - **Solution**: Upload image immediately before posting tweet
   - **Pattern**: fetch → upload → tweet (all in same iteration)
   - **Don't**: Pre-fetch all images, then upload later

4. **Buffer vs File Path**
   - **Issue**: twitter-api-v2 supports both file paths and Buffers
   - **Our Case**: We use Buffer (from fetch API)
   - **Required**: Must specify `mimeType` option when using Buffer
   - **Code**: `uploadMedia(buffer, { mimeType: 'image/jpeg' })`
   - **Why**: Without file extension, package can't auto-detect type

5. **Image URL Detection**
   - **Issue**: PS Store has many images (icons, buttons, backgrounds)
   - **Symptom**: Wrong image selected (tiny icon instead of cover)
   - **Solution**: Use specific selectors for PlayStation CDN images
   - **Pattern**: `img[src*="image.api.playstation.com"]` targets game images
   - **Fallback**: Check image dimensions (width/height > 300px)

6. **Browser Resource Cleanup**
   - **Issue**: Not closing browser leaks memory
   - **Symptom**: Process doesn't exit cleanly, memory grows
   - **Solution**: Close browser in cleanup() method
   - **When**: After all tweets are posted
   - **Pattern**:
     ```typescript
     try {
       // post all tweets
     } finally {
       await this.cleanup(); // ensure cleanup happens
     }
     ```

7. **Cookie Consent Dialogs**
   - **Issue**: Some regions show cookie consent before content
   - **Symptom**: Content doesn't load, selectors timeout
   - **Solution**: May need to accept cookies (like PS Store scraper does)
   - **Code**:
     ```typescript
     const cookieButton = await page.waitForSelector('button[data-qa="accept-cookies"]', { timeout: 5000 });
     if (cookieButton) await cookieButton.click();
     ```

8. **Image Format Detection**
   - **Issue**: Need to tell Twitter what image format we're uploading
   - **Solution**: Detect from URL extension (.jpg, .png, .webp)
   - **Fallback**: Default to 'jpg' if unknown
   - **Code**:
     ```typescript
     let imageType = 'jpg';
     if (imageUrl.includes('.png')) imageType = 'png';
     else if (imageUrl.includes('.webp')) imageType = 'webp';
     ```

9. **Rate Limiting Increased**
   - **Issue**: Image fetching + uploading takes time
   - **Solution**: Increase delay between tweets from 1s to 2s
   - **Why**: Avoid Twitter rate limits and give browser time to cleanup
   - **Code**: `await this.sleep(2000);`

10. **Graceful Degradation is Critical**
    - **Issue**: Image fetching might fail (network, selectors, etc.)
    - **Solution**: Always fallback to text-only tweets
    - **Pattern**:
      ```typescript
      const imageBuffer = await fetchGameImage(url);
      if (imageBuffer) {
        // upload and attach
      } else {
        // post without image (existing behavior)
      }
      ```
    - **Why**: Text-only tweet is better than no tweet

### Best Practices

1. **Browser Reuse**
   - Launch browser once, reuse for all games
   - Close browser after all tweets posted
   - Saves time and resources
   - Pattern: `this.browser = this.browser || await chromium.launch(...)`

2. **Multiple Selector Strategies**
   - Try specific selectors first (PlayStation CDN URLs)
   - Fall back to generic selectors (any large image)
   - Don't fail immediately; try alternatives
   - Log which strategy worked for debugging

3. **Error Logging**
   - Log every step: fetching, downloading, uploading
   - Include context: game title, URL, buffer size
   - Helps debug which game/image caused issues
   - Pattern: `logger.info(\`Fetching image for "${game.title}"...\`)`

4. **Dry-Run Support**
   - Don't launch browser in dry-run mode
   - Log what would happen: "Would fetch image from: {url}"
   - Allows testing without API calls
   - Pattern: `if (dryRun) { logger.info(...); return; }`

5. **Type Safety**
   - Use TypeScript for all helper methods
   - Return types: `Promise<Buffer | null>`, `Promise<string | null>`
   - Null means failure, handle explicitly
   - Never throw errors; return null and log

6. **Image Size Validation** (Optional Enhancement)
   - Check buffer size before upload (Twitter has limits)
   - Typical limit: 5MB for images
   - Pattern:
     ```typescript
     if (buffer.length > 5 * 1024 * 1024) {
       logger.warn('Image too large, skipping');
       return null;
     }
     ```

7. **Timeout Configuration**
   - Use reasonable timeouts for page navigation (30s)
   - Use shorter timeouts for selectors (10s)
   - Don't wait forever; fail fast and fallback
   - Pattern: `{ timeout: 10000 }`

8. **User-Agent Headers**
   - Always set realistic User-Agent
   - Copy from existing PS Store scraper
   - Prevents scraper detection/blocking
   - Pattern: `'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'`

9. **Logging Consistency**
   - Use emoji for visual clarity (🐦, 📷, ✅)
   - Match existing logger style
   - Log success with `logger.success()`
   - Log warnings with `logger.warn()`
   - Log errors with `logger.error()`

10. **Testing Strategy**
    - Start with dry-run mode
    - Test with one game first
    - Then test with multiple games
    - Test error scenarios (no URL, bad URL, etc.)
    - Verify on Twitter that images appear

---

## 9. Expected Outcome Examples

### Console Output - With Images Successfully Attached

```
[INFO] 2025-10-29T... - 🚀 Starting Backloggd PS5 Pro Maintainer...

[INFO] 2025-10-29T... - 📥 Step 1: Scraping PlayStation Store
✓ [SUCCESS] 2025-10-29T... - Scraped 195 games from PlayStation Store

[INFO] 2025-10-29T... - 📥 Step 2: Scraping Backloggd list
✓ [SUCCESS] 2025-10-29T... - Scraped 192 games from Backloggd

[INFO] 2025-10-29T... - 🔍 Step 3: Performing bidirectional comparison
[INFO] 2025-10-29T... - Comparison complete: 3 to add, 0 to remove, 192 in sync

================================================================================
📊 COMPARISON RESULTS
================================================================================

✅ GAMES TO ADD (3):
--------------------------------------------------------------------------------
1. Dragon Age: The Veilguard
   URL: https://store.playstation.com/es-es/concept/10000291
2. Resident Evil 4
   URL: https://store.playstation.com/es-es/concept/10001234
3. The Last of Us Part II Remastered
   URL: https://store.playstation.com/es-es/concept/10005678

✅ No erroneous games found - list is accurate!

✓ Already in sync: 192 games

================================================================================

[INFO] 2025-10-29T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-29T... - 🐦 Twitter service initialized
[INFO] 2025-10-29T... - 📢 Starting notification process...

[INFO] 2025-10-29T... - Fetching image for "Dragon Age: The Veilguard"...
[INFO] 2025-10-29T... - Fetching image from: https://store.playstation.com/es-es/concept/10000291
[INFO] 2025-10-29T... - Downloading image: https://image.api.playstation.com/vulcan/ap/rnd/202401/1234/abcd1234.png
✓ [SUCCESS] 2025-10-29T... - Image fetched successfully (284631 bytes)
[INFO] 2025-10-29T... - Uploading image to Twitter (284631 bytes, type: png)
✓ [SUCCESS] 2025-10-29T... - Image uploaded to Twitter (media_id: 1851234567890123456)
[INFO] 2025-10-29T... - Tweet will include image
✓ [SUCCESS] 2025-10-29T... - 🐦 Tweet posted for "Dragon Age: The Veilguard" (ID: 1851234567890123457) with image

[INFO] 2025-10-29T... - Fetching image for "Resident Evil 4"...
[INFO] 2025-10-29T... - Fetching image from: https://store.playstation.com/es-es/concept/10001234
[INFO] 2025-10-29T... - Downloading image: https://image.api.playstation.com/vulcan/ap/rnd/202402/5678/efgh5678.jpg
✓ [SUCCESS] 2025-10-29T... - Image fetched successfully (312445 bytes)
[INFO] 2025-10-29T... - Uploading image to Twitter (312445 bytes, type: jpg)
✓ [SUCCESS] 2025-10-29T... - Image uploaded to Twitter (media_id: 1851234567890123458)
[INFO] 2025-10-29T... - Tweet will include image
✓ [SUCCESS] 2025-10-29T... - 🐦 Tweet posted for "Resident Evil 4" (ID: 1851234567890123459) with image

[INFO] 2025-10-29T... - Fetching image for "The Last of Us Part II Remastered"...
[INFO] 2025-10-29T... - Fetching image from: https://store.playstation.com/es-es/concept/10005678
[INFO] 2025-10-29T... - Downloading image: https://image.api.playstation.com/vulcan/ap/rnd/202403/9012/ijkl9012.png
✓ [SUCCESS] 2025-10-29T... - Image fetched successfully (298771 bytes)
[INFO] 2025-10-29T... - Uploading image to Twitter (298771 bytes, type: png)
✓ [SUCCESS] 2025-10-29T... - Image uploaded to Twitter (media_id: 1851234567890123460)
[INFO] 2025-10-29T... - Tweet will include image
✓ [SUCCESS] 2025-10-29T... - 🐦 Tweet posted for "The Last of Us Part II Remastered" (ID: 1851234567890123461) with image

[INFO] 2025-10-29T... - Browser instance closed
[INFO] 2025-10-29T... - Twitter: 3/3 tweets posted successfully
✓ [SUCCESS] 2025-10-29T... - 📢 All notifications sent successfully (2 services)

⚠ [WARN] 2025-10-29T... - ⚠️  List requires updates (see above for details)
```

### Console Output - Fallback to Text-Only (Image Fetch Failed)

```
[INFO] 2025-10-29T... - Fetching image for "Some New Game"...
[INFO] 2025-10-29T... - Fetching image from: https://store.playstation.com/es-es/concept/99999999
⚠ [WARN] 2025-10-29T... - Could not find primary image selector, trying fallback
⚠ [WARN] 2025-10-29T... - No suitable image found on page: https://store.playstation.com/es-es/concept/99999999
⚠ [WARN] 2025-10-29T... - No image found for "Some New Game", posting text-only tweet
✓ [SUCCESS] 2025-10-29T... - 🐦 Tweet posted for "Some New Game" (ID: 1851234567890123462)
```

### Console Output - Dry Run Mode

```
[INFO] 2025-10-29T... - 📢 Step 4: Sending notifications
[INFO] 2025-10-29T... - 🐦 Twitter service initialized
[INFO] 2025-10-29T... - 📢 Starting notification process...
[INFO] 2025-10-29T... - 🔍 [DRY RUN] Would post tweet:
[INFO] 2025-10-29T... - 🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

                         #PS5Pro #PlayStation #Gaming
                         https://store.playstation.com/es-es/concept/10000291
[INFO] 2025-10-29T... - [DRY RUN] Would fetch image from: https://store.playstation.com/es-es/concept/10000291
[INFO] 2025-10-29T... - Twitter: 3/3 tweets posted successfully
```

### Tweet Example (As Seen on Twitter/X)

**Text:**
```
🎮 New PS5 Pro Enhanced Game: Dragon Age: The Veilguard

#PS5Pro #PlayStation #Gaming
https://store.playstation.com/es-es/concept/10000291
```

**Attached Image:**
[Game cover image showing Dragon Age: The Veilguard artwork]

**Visual on Twitter:**
- Large, eye-catching game cover image displayed above tweet text
- Image is clickable to view full size
- Professional appearance matching official game announcements

---

## 10. Quality Checklist

- [x] All necessary context included (PS Store structure, Twitter API, Playwright patterns)
- [x] Validation gates are executable and specific
- [x] References existing patterns in codebase (browser launch, error handling, logging)
- [x] Clear implementation path with complete code examples
- [x] Error handling documented (no image found, fetch failures, upload failures)
- [x] Gotchas identified with solutions (lazy loading, v1 vs v2 API, media expiration)
- [x] External documentation URLs provided (Twitter API, twitter-api-v2, Playwright)
- [x] Specific file and line references for modifications
- [x] Task breakdown ordered by dependencies
- [x] Expected output examples provided (console logs, tweet examples)
- [x] Browser resource cleanup ensured
- [x] Graceful degradation (fallback to text-only tweets)
- [x] Rate limiting adjusted (2s between tweets for image processing)
- [x] Multiple test scenarios documented
- [x] No new dependencies required (uses existing Playwright and twitter-api-v2)

---

## 11. Confidence Score

**Score: 9/10**

### Strengths
- **Zero New Dependencies**: Uses existing Playwright and twitter-api-v2 packages
- **Well-Researched**: Based on official Twitter API docs, twitter-api-v2 examples, and PS Store structure analysis
- **Clear Integration Point**: Extends existing TwitterService with minimal changes
- **Proven Patterns**: Reuses patterns from existing PS Store scraper
- **Graceful Degradation**: Falls back to text-only tweets if images fail
- **Type Safety**: Full TypeScript support with proper types
- **Browser Resource Management**: Proper cleanup to prevent memory leaks
- **Comprehensive Error Handling**: Try-catch at every step, returns null on failure
- **Dry-Run Support**: Can test without actual API calls
- **Multiple Fallback Strategies**: 3 different selector strategies for image extraction
- **Complete Code Provided**: Full implementation for all new methods

### Uncertainties (-1 point)

1. **PS Store Image Selectors Variability** (-0.5 points)
   - **Issue**: PlayStation Store structure may vary by region or change over time
   - **Symptom**: Selectors might not find images on some game pages
   - **Mitigation**: Implemented 3 fallback selector strategies
   - **Mitigation**: Graceful fallback to text-only tweets
   - **Impact**: Low - Multiple strategies and fallback ensures tweets always post

2. **Image Format Edge Cases** (-0.3 points)
   - **Issue**: Some games might use WebP or other modern formats
   - **Symptom**: Image type detection from URL might fail
   - **Mitigation**: Default to 'jpg' if format can't be detected
   - **Mitigation**: twitter-api-v2 handles most formats automatically
   - **Impact**: Very Low - Default works for most cases

3. **Twitter Image Size Limits** (-0.2 points)
   - **Issue**: PS Store images might exceed Twitter's 5MB limit
   - **Symptom**: Upload fails with size error
   - **Mitigation**: Graceful error handling, falls back to text-only
   - **Future Enhancement**: Add buffer size check before upload
   - **Impact**: Very Low - Most game covers are under 5MB, fallback works

### Risk Mitigation Strategies

1. **Multiple Selector Strategies**:
   - Primary: PlayStation CDN images (`img[src*="image.api.playstation.com"]`)
   - Fallback 1: Large images by dimensions (width/height > 300)
   - Fallback 2: Any HTTPS image
   - Result: High probability of finding suitable image

2. **Graceful Degradation**:
   - Every image operation can fail without breaking script
   - Returns null on failure, checked explicitly
   - Falls back to existing text-only tweet behavior
   - Result: Script never fails due to image issues

3. **Browser Resource Management**:
   - Browser launched once and reused
   - Explicit cleanup after all tweets
   - Finally block ensures cleanup happens
   - Result: No memory leaks, clean process exit

4. **Incremental Testing**:
   - Start with dry-run (no actual operations)
   - Test with one game first
   - Then test with multiple games
   - Test error scenarios
   - Result: Safe rollout, early issue detection

5. **Existing Package Capabilities**:
   - twitter-api-v2 already handles v1+v2 API combination
   - Playwright already in use for PS Store scraping
   - Node.js fetch API built-in (no new dependency)
   - Result: Low risk, proven packages

### Expected One-Pass Success

With this PRP, an AI agent should successfully implement image attachment in one pass. The implementation is straightforward:

1. **Add Helper Methods**: 3 new private methods (~150 lines total)
   - `fetchGameImage()` - Browser automation (50 lines)
   - `downloadImageToBuffer()` - HTTP fetch (15 lines)
   - `uploadImageToTwitter()` - Twitter API call (25 lines)
   - `cleanup()` - Resource cleanup (10 lines)

2. **Modify Existing Method**: Update `postNewGameTweets()` (~20 lines added)
   - Add image fetch before tweet
   - Add media_ids to tweet payload
   - Add cleanup after loop

3. **Total New Code**: ~170 lines, well-documented

**Dependencies**:
- Zero new npm packages (uses existing Playwright, twitter-api-v2)
- Browser patterns copied from existing PS Store scraper
- Twitter API patterns based on official examples

**Testing approach** (safe and thorough):
- Dry-run mode first (validates logic without API calls)
- Single game test (validates image pipeline)
- Multiple games test (validates browser reuse)
- Error scenarios (validates fallback behavior)

**Why 9/10 instead of 10/10**:
- PS Store structure not fully documented (relying on exploration + fallbacks)
- Some edge cases with image formats/sizes possible
- But: All risks mitigated with fallbacks and graceful degradation
- High confidence in one-pass success

---

## 12. Additional Resources

### Twitter API Resources

**Official Documentation**:
- X API Overview: https://developer.x.com/en/docs/x-api
- v1.1 Media Upload: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-upload
- v1.1 Media Guide: https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/overview
- v2 Create Tweet: https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets

**NPM Package**:
- twitter-api-v2: https://www.npmjs.com/package/twitter-api-v2
- GitHub: https://github.com/PLhery/node-twitter-api-v2
- Examples: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/examples.md
- v1 API Docs: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v1.md
- v2 API Docs: https://github.com/PLhery/node-twitter-api-v2/blob/master/doc/v2.md

### Playwright Resources

**Official Documentation**:
- Playwright API: https://playwright.dev/docs/api/class-playwright
- Selectors: https://playwright.dev/docs/selectors
- Page Navigation: https://playwright.dev/docs/api/class-page#page-goto
- Screenshots: https://playwright.dev/docs/screenshots
- Downloads: https://playwright.dev/docs/downloads
- Network: https://playwright.dev/docs/network

**Guides**:
- Downloading Files: https://scrapingant.com/blog/playwright-download-file
- Image Extraction: https://medium.com/@danangfirmino26/unleashing-web-image-extraction-combining-playwright-and-axios-for-efficient-scraping-de3248115173

### Node.js Resources

**Built-in APIs**:
- Fetch API: https://nodejs.org/dist/latest-v18.x/docs/api/globals.html#fetch
- Buffer: https://nodejs.org/api/buffer.html
- setTimeout/Promises: https://nodejs.org/api/timers.html

### PlayStation Store Structure

**Insights from Exploration**:
- Category URL: `https://store.playstation.com/{region}/category/{uuid}/{page}`
- Game URL: `https://store.playstation.com/{region}/concept/{id}`
- Image CDN: `https://image.api.playstation.com/vulcan/ap/rnd/{date}/{id}/{filename}.{ext}`
- Typical formats: PNG, JPG
- Typical sizes: 200-500 KB per cover image

### Best Practices Resources

**Web Scraping**:
- Playwright Best Practices: https://playwright.dev/docs/best-practices
- User-Agent Strings: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent
- Rate Limiting: https://cloud.google.com/architecture/rate-limiting-strategies-techniques

**TypeScript Patterns**:
- Error Handling: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Async/Await: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
- Promise.all: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all

**Social Media Automation**:
- Twitter Best Practices: https://developer.x.com/en/docs/twitter-api/rate-limits
- Media Guidelines: https://help.twitter.com/en/using-x/twitter-supported-media

---

## 13. Future Enhancements

### Short-term Improvements

1. **Image Size Validation**
   - Check buffer size before upload (< 5MB)
   - Log warning for oversized images
   - Prevents failed uploads

2. **Image Caching**
   - Cache downloaded images temporarily
   - Reuse if tweeting about same game multiple times
   - Reduces PS Store requests

3. **Better Image Selection**
   - Prefer hero/cover images over screenshots
   - Check image aspect ratio (prefer 16:9 or 3:4)
   - Use image alt text to identify best image

### Medium-term Additions

4. **Image Optimization**
   - Resize large images before upload
   - Convert WebP to JPG/PNG if needed
   - Compress images to reduce upload time
   - Library: sharp or jimp

5. **Multiple Images**
   - Attach up to 4 images per tweet (Twitter limit)
   - Include cover + screenshots
   - Create image collages

6. **Alt Text for Accessibility**
   - Add descriptive alt text to images
   - Improves accessibility
   - Twitter API supports this: `media.media_ids: [{ id, alt_text }]`

### Long-term Features

7. **Video Support**
   - Extract game trailers from PS Store
   - Upload videos to Twitter
   - Requires chunked upload API

8. **Image Analytics**
   - Track engagement on tweets with vs without images
   - A/B testing different image types
   - Optimize image selection based on engagement

9. **Smart Image Selection**
   - Use AI to select best promotional image
   - Prefer images with game logo visible
   - Avoid spoiler images

10. **CDN Integration**
    - Host images on CDN first
    - Reference CDN URLs instead of uploading
    - Faster, more reliable

---

**Generated with Claude Code**
**PRP Version**: 1.0
**Created**: 2025-10-29
**Scope**: Add game cover images to Twitter posts for new PS5 Pro enhanced games
