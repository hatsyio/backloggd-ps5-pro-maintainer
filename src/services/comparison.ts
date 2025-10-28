import { Game, ComparisonResult } from '../types/game';
import { logger } from './logger';
import { titleMapper } from './title-mapper';
import { manualAdditionsManager } from './manual-additions';

/**
 * Performs bidirectional comparison of game lists
 *
 * Strategy:
 * 1. Normalize titles (lowercase, remove special chars)
 * 2. Find games in PS Store but not in Backloggd (to add)
 * 3. Find games in Backloggd but not in PS Store (errors, to remove)
 * 4. Find games correctly in both lists
 */
export function compareGameLists(psStoreGames: Game[], backloggdGames: Game[]): ComparisonResult {
  // Create normalized lookup maps
  const psStoreMap = new Map<string, Game>();
  const backloggdMap = new Map<string, Game>();

  psStoreGames.forEach((game) => {
    // Apply title mapping: PS Store → Backloggd, then normalize
    const mappedTitle = titleMapper.mapPsStoreToBackloggd(game.title);
    psStoreMap.set(normalizeTitle(mappedTitle), game);
  });

  backloggdGames.forEach((game) => {
    backloggdMap.set(normalizeTitle(game.title), game);
  });

  // Find missing games (in PS Store but not in Backloggd)
  const gamesToAdd: Game[] = [];
  psStoreGames.forEach((game) => {
    const mappedTitle = titleMapper.mapPsStoreToBackloggd(game.title);
    const normalized = normalizeTitle(mappedTitle);
    if (!backloggdMap.has(normalized)) {
      gamesToAdd.push(game);
    }
  });

  // Find erroneous games (in Backloggd but not in PS Store)
  // Exclude manually added games (PS5 enhanced games not in PS Store webpage)
  const gamesToRemove: Game[] = [];
  backloggdGames.forEach((game) => {
    const normalized = normalizeTitle(game.title);
    if (!psStoreMap.has(normalized)) {
      // Check if this game is manually added (should be kept)
      if (!manualAdditionsManager.isManuallyAdded(game.title)) {
        gamesToRemove.push(game);
      }
    }
  });

  // Find correctly synced games
  const alreadyInSync: Game[] = [];
  psStoreGames.forEach((game) => {
    const mappedTitle = titleMapper.mapPsStoreToBackloggd(game.title);
    const normalized = normalizeTitle(mappedTitle);
    if (backloggdMap.has(normalized)) {
      alreadyInSync.push(game);
    }
  });

  logger.info(
    `Comparison complete: ${gamesToAdd.length} to add, ${gamesToRemove.length} to remove, ${alreadyInSync.length} in sync`
  );

  return {
    gamesToAdd,
    gamesToRemove,
    alreadyInSync,
  };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces for better matching
    .replace(/\s+/g, ' ')
    .trim();
}
