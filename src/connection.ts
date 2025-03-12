import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import { Logger } from './types.js';

/**
 * Connection class for managing MongoDB connections
 */
export class Connection {
  private client: MongoClient | null;
  private db: Db | null;
  private logger: Logger;

  /**
   * Create a new Connection instance
   * @param logger - Logger instance
   */
  constructor(logger: Logger) {
    this.client = null;
    this.db = null;
    this.logger = logger;
  }
  
  /**
   * Get the MongoDB database instance
   * @returns MongoDB database instance
   */
  async getDb(): Promise<Db> {    
    if (!this.db) {
      throw new Error('Database connection not established');
    }
    
    return this.db;
  }
  
  /**
   * Close the MongoDB connection
   */
  async close(): Promise<void> {
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
      }
    }
  }
  
  /**
   * Connect to MongoDB
   * @param uri - MongoDB connection string
   * @param dbName - Database name
   * @param connectionOptions - MongoDB connection options
   * @returns MongoDB database instance
   */
  async connect(uri: string, dbName: string, connectionOptions: MongoClientOptions = {}): Promise<Db> {
    if (!uri) {
      throw new Error('MongoDB connection URI is required');
    }
    
    if (!dbName) {
      throw new Error('Database name is required');
    }

    try {
      if (this.logger) {
        this.logger.debug('Attempting to connect to MongoDB');
      }
      
      // Filter out non-MongoDB options
      this.client = new MongoClient(uri, connectionOptions);
      await this.client.connect();
      this.db = this.client.db(dbName);
      
      if (this.logger) {
        this.logger.info(`Connected to MongoDB database: ${dbName}`);
      }
      return this.db;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to connect to MongoDB: ${(error as Error).message}`);
      }
      throw error;
    }
  }
}
