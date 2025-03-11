const Connection = require('./connection');
const Schema = require('./schema');
const Model = require('./model');
const { ConsoleLogger, isCompatibleLogger } = require('./logger');

/**
 * MongoZen class - Main entry point for MongoDB ODM functionality
 */
class MongoZen {
  /**
   * Create a new MongoZen instance
   * @param {Object} options - Options for MongoZen
   * @param {Object} options.logger - Logger configuration options
   * @param {string} options.logLevel - Log level (debug, info, warn, error)
   */
  constructor(options = {}) {
    // Store instance options
    this.options = options;
    
    // Handle logger setup
    if (options.logger) {
      // Check if the provided logger has the required methods
      if (isCompatibleLogger(options.logger)) {
        this.logger = options.logger;
      } else {
        console.warn('Provided logger is not compatible. Using default logger.');
        this.logger = new ConsoleLogger('info');;
      }
    } else {
      this.logger = new ConsoleLogger('info');;
    }
    
    // Set log level if provided
    if (options.logLevel && typeof this.logger.setLevel === 'function') {
      this.logger.setLevel(options.logLevel);
    } else if (options.logLevel) {
      this.logger.level = options.logLevel;
    }
    
    // Initialize connection with the same logger
    this.connection = new Connection(this.logger);
    
    // Expose Schema constructor directly
    this.Schema = Schema;
  }
  
  /**
   * Get the current logger instance
   * @returns {Object} - Winston logger instance
   */
  getLogger() {
    return this.logger;
  }
  
  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection string
   * @param {string} dbName - Database name
   * @param {Object} connectionOptions - MongoDB connection options
   * @returns {Promise<Object>} - MongoDB database instance
   */
  async connect(uri, dbName, connectionOptions = {}) {
    this.logger.debug('Attempting to connect to MongoDB');
    // Filter out non-MongoDB options before passing to connect
    const mongoOptions = { ...connectionOptions };
    // Remove our custom options that shouldn't be passed to MongoDB client
    delete mongoOptions.logLevel;
    delete mongoOptions.logger;
    
    return await this.connection.connect(uri, dbName, mongoOptions);
  }
  
  /**
   * Set the log level
   * @param {string} level - Log level (debug, info, warn, error)
   * @returns {boolean} - True if log level was set successfully
   */
  setLogLevel(level) {
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
  }
  
  /**
   * Close the MongoDB connection
   * @returns {Promise<void>}
   */
  async close() {
    this.logger.debug('Closing MongoDB connection');
    return await this.connection.close();
  }
  
  /**
   * Create a new Connection instance
   * @param {Object} options - Connection options
   * @param {string} options.uri - MongoDB connection URI
   * @param {string} options.dbName - Database name
   * @returns {Object} - Connection instance
   */
  createConnection(options = {}) {
    this.logger.debug('Creating new Connection instance');
    const connection = new Connection(this.logger);
    
    // Store options on the connection for later use
    connection.options = options;
    
    return connection;
  }
  
  /**
   * Create a new Schema instance
   * @param {Object} definition - Schema definition
   * @param {Object} options - Schema options
   * @returns {Object} - Schema instance
   */
  createSchema(definition, options = {}) {
    this.logger.debug('Creating new Schema instance');
    return new Schema(definition, {
      ...options,
      logger: this.logger
    });
  }
  
  /**
   * Create a new Model instance
   * @param {string} collectionName - Name of the MongoDB collection
   * @param {Object} schema - Schema object created with Schema constructor
   * @returns {Object} - Model instance
   */
  createModel(collectionName, schema) {
    // Log model creation if logger is available
    if (this.logger) {
      this.logger.debug(`Creating model for collection: ${collectionName}`);
    }
    
    // Create a new Model instance with the MongoZen connection and logger
    return new Model(collectionName, schema, { 
      connection: this.connection, 
      logger: this.logger
    });
  }
}

module.exports = MongoZen;
