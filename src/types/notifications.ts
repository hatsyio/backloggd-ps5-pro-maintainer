import { ComparisonResult } from './game';

/**
 * Configuration for Telegram notifications
 */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

/**
 * Configuration for Twitter notifications
 */
export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
  enabled: boolean;
}

/**
 * Overall notification configuration
 */
export interface NotificationConfig {
  telegram: TelegramConfig;
  twitter: TwitterConfig;
  dryRun: boolean; // If true, log what would be sent without sending
}

/**
 * Result of sending a notification
 */
export interface NotificationResult {
  service: 'telegram' | 'twitter';
  success: boolean;
  error?: string;
  messagesSent?: number;
}

/**
 * Data to be sent in notifications
 */
export interface NotificationData {
  comparisonResult: ComparisonResult;
  timestamp: Date;
  hasChanges: boolean;
}
