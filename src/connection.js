const { MongoClient } = require('mongodb');

/**
 * Connection class for managing MongoDB connections
 */
class Connection {
  // Use properties instead of private fields for backward compatibility with tests
  constructor(logger = null) {
    this.client = null;
    this.db = null;
    this.isConnected = false;
    this.logger = logger;
  }
  
  /**
   * Get the MongoDB database instance
   * @param {string} uri - MongoDB connection string (optional if already connected)
   * @param {string} dbName - Database name (optional if already connected)
   * @param {Object} connectionOptions - MongoDB connection options (optional)
   * @returns {Object} - MongoDB database instance
   */
  async getDb(uri, dbName, connectionOptions) {
    if (!this.isConnected) {
      await this.connect(uri, dbName, connectionOptions);
    }
    return this.db;
  }
  
  /**
   * Close the MongoDB connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      try {
        await this.client.close();
        if (this.logger) {
          this.logger.info('MongoDB connection closed');
        }
      } catch (error) {
        throw error;
      } finally {
        this.client = null;
        this.db = null;
        this.isConnected = false;
      }
    }
  }
  
  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection string
   * @param {string} dbName - Database name
   * @param {Object} connectionOptions - MongoDB connection options
   * @returns {Promise<Object>} - MongoDB database instance
   */
  async connect(uri, dbName, connectionOptions = {}) {
    if (!uri) {
      throw new Error('MongoDB connection URI is required');
    }
    
    if (!dbName) {
      throw new Error('Database name is required');
    }

    try {
      // Create a clean copy of connection options
      const options = { ...connectionOptions };
      
      // Filter out non-MongoDB options
      delete options.logger;
      delete options.logLevel;
      
      this.client = new MongoClient(uri, options);
      await this.client.connect();
      this.isConnected = true;
      this.db = this.client.db(dbName);
      
      if (this.logger) {
        this.logger.info(`Connected to MongoDB database: ${dbName}`);
      }
      return this.db;
    } catch (error) {
      this.isConnected = false;
      if (this.logger) {
        this.logger.error(`Failed to connect to MongoDB: ${error.message}`);
      }
      throw error;
    }
  }
}

module.exports = Connection;
