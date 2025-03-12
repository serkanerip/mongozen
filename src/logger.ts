import { Logger } from './types.js';

/**
 * Log levels and their priorities
 */
export const LOG_LEVELS: Record<string, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Console-based logger class
 */
export class ConsoleLogger implements Logger {
  level: string;

  /**
   * Create a simple console-based logger
   * @param level - Default log level
   */
  constructor(level: string = 'info') {
    this.level = level;
  }

  /**
   * Get current timestamp in ISO format
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Check if the message should be logged based on current level
   */
  private shouldLog(messageLevel: string): boolean {
    const currentLevelValue = LOG_LEVELS[this.level] || LOG_LEVELS.info;
    const messageLevelValue = LOG_LEVELS[messageLevel] || LOG_LEVELS.info;
    return messageLevelValue <= currentLevelValue;
  }

  /**
   * Log error message
   */
  error(message: string): void {
    console.error(`${this.getTimestamp()} [ERROR]: ${message}`);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(`${this.getTimestamp()} [WARN]: ${message}`);
    }
  }

  /**
   * Log info message
   */
  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(`${this.getTimestamp()} [INFO]: ${message}`);
    }
  }

  /**
   * Log debug message
   */
  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.log(`${this.getTimestamp()} [DEBUG]: ${message}`);
    }
  }

  /**
   * Set the log level
   * @param newLevel - New log level
   * @returns True if level was set successfully
   */
  setLevel(newLevel: string): boolean {
    if (LOG_LEVELS[newLevel] !== undefined) {
      this.level = newLevel;
      return true;
    }
    return false;
  }
}

/**
 * Validate if an object is a compatible logger
 * @param logger - Logger to validate
 * @returns True if logger is compatible
 */
export function isCompatibleLogger(logger: any): boolean {
  return !!(logger && 
    typeof logger === 'object' && 
    typeof logger.error === 'function' && 
    typeof logger.warn === 'function' && 
    typeof logger.info === 'function' && 
    typeof logger.debug === 'function');
}
