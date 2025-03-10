const { MongoClient } = require('mongodb');

/**
 * Connection constructor function
 * @param {Object} options - Options for the connection
 * @returns {Object} - Connection instance
 */
function Connection(options = {}) {
  this.client = null;
  this.db = null;
  this.isConnected = false;
  this.options = options;
  this.logger = options.logger;
}

/**
 * Get the MongoDB database instance
 * @returns {Object} - MongoDB database instance
 */
Connection.prototype.getDb = async function() {
  if (!this.isConnected) {
    await this.connect();
  }
  return this.db;
};

/**
 * Close the MongoDB connection
 * @returns {Promise<void>}
 */
Connection.prototype.close = async function() {
  if (this.client) {
    await this.client.close();
    this.client = null;
    this.db = null;
    if (this.logger) {
      this.logger.info('MongoDB connection closed');
    }
  }
};

/**
* Connect to MongoDB
* @param {string} uri - MongoDB connection string
* @param {string} dbName - Database name
* @param {Object} connectionOptions - MongoDB connection options
* @returns {Promise<Object>} - MongoDB database instance
*/
Connection.prototype.connect = async function(uri, dbName, connectionOptions = {}) {
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
   
   this.client = new MongoClient(uri, mergedOptions);
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
};

// Export the Connection constructor
module.exports = Connection;
