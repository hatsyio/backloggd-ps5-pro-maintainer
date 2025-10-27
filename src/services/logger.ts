import { Game } from '../types/game';

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },

  error: (message: string, error?: unknown) => {
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
  },
};
