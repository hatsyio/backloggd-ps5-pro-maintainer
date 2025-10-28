import mappingsData from '../data/game-title-mappings.json';
import { GameMappings, GameTitleMapping } from '../types/game';
import { logger } from './logger';

/**
 * Service for mapping game titles between PS Store and Backloggd
 *
 * Strategy:
 * 1. Load mappings from JSON file at initialization
 * 2. Create bidirectional lookup Maps for O(1) performance
 * 3. Provide methods to get mapped titles in both directions
 * 4. Handle case-insensitive lookups
 * 5. Return original title if no mapping exists
 */
class TitleMapper {
  private psStoreToBackloggd: Map<string, string>;
  private backloggdToPsStore: Map<string, string>;
  private mappings: GameTitleMapping[];

  constructor() {
    this.psStoreToBackloggd = new Map();
    this.backloggdToPsStore = new Map();
    this.mappings = [];
    this.loadMappings();
  }

  /**
   * Loads mappings from JSON file and builds lookup Maps
   */
  private loadMappings(): void {
    try {
      const data = mappingsData as GameMappings;
      this.mappings = data.mappings;

      // Build bidirectional lookup maps with case-insensitive keys
      data.mappings.forEach((mapping) => {
        const psKey = mapping.psStoreTitle.toLowerCase();
        const bgKey = mapping.backloggdTitle.toLowerCase();

        this.psStoreToBackloggd.set(psKey, mapping.backloggdTitle);
        this.backloggdToPsStore.set(bgKey, mapping.psStoreTitle);
      });

      logger.info(`Loaded ${this.mappings.length} game title mappings (v${data.version})`);
    } catch (error) {
      logger.warn('Failed to load game title mappings, comparison will use direct matching only');
      logger.error('Mapping load error', error);
    }
  }

  /**
   * Maps a PS Store title to its Backloggd equivalent
   * Returns original title if no mapping exists
   */
  public mapPsStoreToBackloggd(psStoreTitle: string): string {
    const key = psStoreTitle.toLowerCase();
    return this.psStoreToBackloggd.get(key) || psStoreTitle;
  }

  /**
   * Maps a Backloggd title to its PS Store equivalent
   * Returns original title if no mapping exists
   */
  public mapBackloggdToPsStore(backloggdTitle: string): string {
    const key = backloggdTitle.toLowerCase();
    return this.backloggdToPsStore.get(key) || backloggdTitle;
  }

  /**
   * Checks if a PS Store title has a mapping
   */
  public hasPsStoreMapping(psStoreTitle: string): boolean {
    return this.psStoreToBackloggd.has(psStoreTitle.toLowerCase());
  }

  /**
   * Checks if a Backloggd title has a mapping
   */
  public hasBackloggdMapping(backloggdTitle: string): boolean {
    return this.backloggdToPsStore.has(backloggdTitle.toLowerCase());
  }

  /**
   * Returns all loaded mappings
   */
  public getAllMappings(): GameTitleMapping[] {
    return [...this.mappings];
  }

  /**
   * Returns the number of loaded mappings
   */
  public getMappingCount(): number {
    return this.mappings.length;
  }
}

// Export singleton instance
export const titleMapper = new TitleMapper();
