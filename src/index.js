const Connection = require('./connection');
const Schema = require('./schema');
const Model = require('./model');
const { defaultLogger, isCompatibleLogger } = require('./logger');

/**
 * MongoZen constructor function
 * @param {Object} options - Options for MongoZen
 * @param {Object} options.logger - Logger configuration options
 * @param {string} options.logLevel - Log level (debug, info, warn, error)
 * @returns {Object} - MongoZen instance
 */
function MongoZen(options = {}) {
  // Store instance options
  this.options = options;
  
  // Handle logger setup
  if (options.logger) {
    // Check if the provided logger has the required methods
    if (isCompatibleLogger(options.logger)) {
      this.logger = options.logger;
    } else {
      console.warn('Provided logger is not compatible. Using default logger.');
      this.logger = defaultLogger;
    }
  } else {
    this.logger = defaultLogger;
  }
  
  // Set log level if provided
  if (options.logLevel && typeof this.logger.setLevel === 'function') {
    this.logger.setLevel(options.logLevel);
  } else if (options.logLevel) {
    this.logger.level = options.logLevel;
  }
  
  // Initialize connection with the same logger
  this.connection = new Connection({ logger: this.logger });
  
  // Expose Schema constructor directly
  this.Schema = Schema;
  
  /**
   * Get the current logger instance
   * @returns {Object} - Winston logger instance
   */
  this.getLogger = () => this.logger;
  
  /**
   * Expose Model constructor directly
   * This allows users to create models with: new mongoZen.Model(collectionName, schema)
   */
  // Define a custom Model constructor that automatically provides connection and logger
  const self = this;
  this.Model = function(collectionName, schema) {
    // Log model creation if logger is available
    if (self.logger) {
      self.logger.debug(`Creating model for collection: ${collectionName}`);
    }
    
    // Create a new Model instance with the MongoZen connection and logger
    return new Model(collectionName, schema, { 
      connection: self.connection, 
      logger: self.logger 
    });
  };
}

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection string
 * @param {string} dbName - Database name
 * @param {Object} connectionOptions - MongoDB connection options
 * @returns {Promise<Object>} - MongoDB database instance
 */
MongoZen.prototype.connect = async function(uri, dbName, connectionOptions = {}) {
  this.logger.debug('Attempting to connect to MongoDB');
  // Filter out non-MongoDB options before passing to connect
  const mongoOptions = { ...connectionOptions };
  // Remove our custom options that shouldn't be passed to MongoDB client
  delete mongoOptions.logLevel;
  delete mongoOptions.logger;
  
  return await this.connection.connect(uri, dbName, mongoOptions);
};

/**
 * Set the log level
 * @param {string} level - Log level (debug, info, warn, error)
 * @returns {boolean} - True if log level was set successfully
 */
MongoZen.prototype.setLogLevel = function(level) {
  if (!level || typeof level !== 'string') {
    this.logger.warn('Invalid log level provided');
    return false;
  }
  
  const validLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLevels.includes(level.toLowerCase())) {
    this.logger.warn(`Invalid log level: ${level}. Valid levels are: ${validLevels.join(', ')}`);
    return false;
  }
  
  // Use setLevel method if available, otherwise set property directly
  if (typeof this.logger.setLevel === 'function') {
    const result = this.logger.setLevel(level.toLowerCase());
    if (result) {
      this.logger.info(`Changed log level to ${level}`);
    }
    return result;
  } else {
    this.logger.info(`Changing log level from ${this.logger.level} to ${level}`);
    this.logger.level = level.toLowerCase();
    return true;
  }
};

/**
 * Close the MongoDB connection
 * @returns {Promise<void>}
 */
MongoZen.prototype.close = async function() {
  this.logger.debug('Closing MongoDB connection');
  return await this.connection.close();
};

// Export the MongoZen constructor
module.exports = MongoZen;
