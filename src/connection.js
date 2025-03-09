const { MongoClient } = require('mongodb');

/**
 * Connection constructor function
 * @param {Object} options - Options for the connection
 * @returns {Object} - Connection instance
 */
function Connection(options = {}) {
  // Private variables
  let client = null;
  let db = null;
  
  // Store instance options
  this.options = options;
  
  // Use the provided logger
  this.logger = options.logger;
  
  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection string
   * @param {string} dbName - Database name
   * @param {Object} connectionOptions - MongoDB connection options
   * @returns {Promise<Object>} - MongoDB database instance
   */
  this.connect = async (uri, dbName, connectionOptions = {}) => {
    if (!uri) {
      throw new Error('MongoDB connection URI is required');
    }
    
    if (!dbName) {
      throw new Error('Database name is required');
    }

    try {
      // Merge instance options with connection options
      const mergedOptions = { ...connectionOptions };
      
      // Filter out non-MongoDB options
      delete mergedOptions.logger;
      delete mergedOptions.logLevel;
      
      client = new MongoClient(uri, mergedOptions);
      await client.connect();
      db = client.db(dbName);
      
      if (this.logger) {
        this.logger.info(`Connected to MongoDB database: ${dbName}`);
      }
      return db;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to connect to MongoDB: ${error.message}`);
      }
      throw error;
    }
  };
  
  /**
   * Get the MongoDB database instance
   * @returns {Object} - MongoDB database instance
   */
  this.getDb = () => {
    if (!db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return db;
  };
  
  /**
   * Check if connected to MongoDB
   * @returns {boolean} - True if connected, false otherwise
   */
  this.isConnected = () => {
    return !!client && !!db;
  };
  
  /**
   * Close the MongoDB connection
   * @returns {Promise<void>}
   */
  this.close = async () => {
    if (client) {
      await client.close();
      client = null;
      db = null;
      if (this.logger) {
        this.logger.info('MongoDB connection closed');
      }
    }
  };
}

// Export the Connection constructor
module.exports = Connection;
