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
  gamesToAdd: Game[]; // In PS Store but not in Backloggd
  gamesToRemove: Game[]; // In Backloggd but not in PS Store (errors)
  alreadyInSync: Game[]; // Games correctly in both lists
}

/**
 * Represents a mapping between PS Store and Backloggd game titles
 */
export interface GameTitleMapping {
  psStoreTitle: string;
  backloggdTitle: string;
  notes?: string; // Optional explanation for the mapping
}

/**
 * Container for all game title mappings
 */
export interface GameMappings {
  mappings: GameTitleMapping[];
  version: string; // Semantic version for mapping file
  lastUpdated: string; // ISO date string
}

/**
 * Represents a manually added game that exists on Backloggd but not in PS Store
 * These are PS5 enhanced games that should be kept even if not found in PS Store scraping
 */
export interface ManualGameAddition {
  backloggdTitle: string;
  reason: string; // Explanation for why this game is manually added
}

/**
 * Container for all manual game additions
 */
export interface ManualAdditions {
  additions: ManualGameAddition[];
  version: string; // Semantic version for additions file
  lastUpdated: string; // ISO date string
}
