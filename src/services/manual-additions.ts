import additionsData from '../data/manual-additions.json';
import { ManualAdditions, ManualGameAddition } from '../types/game';
import { logger } from './logger';

/**
 * Service for managing manually added games
 *
 * These are games that exist on Backloggd and are PS5 enhanced
 * but are not listed in the PS Store webpage scraping results.
 *
 * Strategy:
 * 1. Load additions from JSON file at initialization
 * 2. Create a Set for O(1) lookup performance
 * 3. Provide method to check if a game is manually added
 * 4. Handle case-insensitive lookups
 */
class ManualAdditionsManager {
  private manualGames: Set<string>;
  private additions: ManualGameAddition[];

  constructor() {
    this.manualGames = new Set();
    this.additions = [];
    this.loadAdditions();
  }

  /**
   * Loads manual additions from JSON file and builds lookup Set
   */
  private loadAdditions(): void {
    try {
      const data = additionsData as ManualAdditions;
      this.additions = data.additions;

      // Build case-insensitive lookup set
      data.additions.forEach((addition) => {
        this.manualGames.add(addition.backloggdTitle.toLowerCase());
      });

      logger.info(`Loaded ${this.additions.length} manual game additions (v${data.version})`);
    } catch (error) {
      logger.warn(
        'Failed to load manual game additions, all Backloggd games will be compared normally'
      );
      logger.error('Manual additions load error', error);
    }
  }

  /**
   * Checks if a game is manually added (should be kept even if not in PS Store)
   * @param backloggdTitle The title from Backloggd to check
   * @returns true if the game is manually added
   */
  public isManuallyAdded(backloggdTitle: string): boolean {
    return this.manualGames.has(backloggdTitle.toLowerCase());
  }

  /**
   * Returns all loaded manual additions
   */
  public getAllAdditions(): ManualGameAddition[] {
    return [...this.additions];
  }

  /**
   * Returns the number of loaded manual additions
   */
  public getAdditionCount(): number {
    return this.additions.length;
  }
}

// Export singleton instance
export const manualAdditionsManager = new ManualAdditionsManager();
