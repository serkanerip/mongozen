/**
 * Log levels and their priorities
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Create a simple console-based logger
 * @param {string} level - Default log level
 * @returns {Object} - Logger object with log methods
 */
function createConsoleLogger(level = 'info') {
  // Get current timestamp in ISO format
  const getTimestamp = () => new Date().toISOString();
  
  // Check if the message should be logged based on current level
  const shouldLog = (messageLevel) => {
    const currentLevelValue = LOG_LEVELS[level] || LOG_LEVELS.info;
    const messageLevelValue = LOG_LEVELS[messageLevel] || LOG_LEVELS.info;
    return messageLevelValue <= currentLevelValue;
  };
  
  return {
    // Current log level
    level,
    
    // Log methods
    error(message) {
      console.error(`${getTimestamp()} [ERROR]: ${message}`);
    },
    
    warn(message) {
      if (shouldLog('warn')) {
        console.warn(`${getTimestamp()} [WARN]: ${message}`);
      }
    },
    
    info(message) {
      if (shouldLog('info')) {
        console.log(`${getTimestamp()} [INFO]: ${message}`);
      }
    },
    
    debug(message) {
      if (shouldLog('debug')) {
        console.log(`${getTimestamp()} [DEBUG]: ${message}`);
      }
    },
    
    // Method to change log level
    setLevel(newLevel) {
      if (LOG_LEVELS[newLevel] !== undefined) {
        this.level = newLevel;
        return true;
      }
      return false;
    }
  };
}

// Create default logger
const defaultLogger = createConsoleLogger('info');

/**
 * Validate if an object is a compatible logger
 * @param {Object} logger - Logger to validate
 * @returns {boolean} - True if logger is compatible
 */
function isCompatibleLogger(logger) {
  return logger && 
    typeof logger === 'object' && 
    typeof logger.error === 'function' && 
    typeof logger.warn === 'function' && 
    typeof logger.info === 'function' && 
    typeof logger.debug === 'function';
}

module.exports = {
  defaultLogger,
  createConsoleLogger,
  isCompatibleLogger,
  LOG_LEVELS
};
