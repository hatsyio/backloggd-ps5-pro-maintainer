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
