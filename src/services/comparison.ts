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
export function compareGameLists(psStoreGames: Game[], backloggdGames: Game[]): ComparisonResult {
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
