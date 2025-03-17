import { Db, MongoClientOptions } from 'mongodb';

import { Connection } from './connection.js';
import { Schema } from './schema.js';
import { Model } from './model.js';
import { ConsoleLogger, isCompatibleLogger } from './logger.js';
import { Logger, MongoZenOptions, SchemaDefinition } from './types.js';

/**
 * MongoZen class - Main entry point for MongoDB ODM functionality
 */
export class MongoZen {
  private logger: Logger;
  private connection: Connection;
  public Schema: typeof Schema;

  /**
   * Create a new MongoZen instance
   * @param options - Options for MongoZen
   */
  constructor(options: MongoZenOptions = {}) {
    // Handle logger setup
    if (options.logger) {
      // Check if the provided logger has the required methods
      if (isCompatibleLogger(options.logger)) {
        this.logger = options.logger;
      } else {
        console.warn('Provided logger is not compatible. Using default logger.');
        this.logger = new ConsoleLogger('info');
      }
    } else {
      this.logger = new ConsoleLogger('info');
    }
    
    // Set log level if provided
    if (options.logLevel && typeof (this.logger as any).setLevel === 'function') {
      (this.logger as any).setLevel(options.logLevel);
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
   * @returns Logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }
  
  /**
   * Connect to MongoDB
   * @param uri - MongoDB connection string
   * @param dbName - Database name
   * @param connectionOptions - MongoDB connection options
   * @returns MongoDB database instance
   */
  async connect(uri: string, dbName: string, connectionOptions: MongoClientOptions = {}): Promise<Db> {
    this.logger.debug('Attempting to connect to MongoDB');
    
    return await this.connection.connect(uri, dbName, connectionOptions);
  }
  
  /**
   * Set the log level
   * @param level - Log level (debug, info, warn, error)
   * @returns True if log level was set successfully
   */
  setLogLevel(level: string): boolean {
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
    if (typeof (this.logger as any).setLevel === 'function') {
      const result = (this.logger as any).setLevel(level.toLowerCase());
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
   */
  async close(): Promise<void> {
    this.logger.debug('Closing MongoDB connection');
    return await this.connection.close();
  }
  
  /**
   * Create a new Schema instance
   * @param definition - Schema definition
   * @param options - Schema options
   * @returns Schema instance
   */
  createSchema(definition: SchemaDefinition, options: Record<string, any> = {}): Schema {
    this.logger.debug('Creating new Schema instance');
    return new Schema(definition, {
      ...options,
      logger: this.logger
    });
  }
  
  /**
   * Create a new Model instance
   * @param collectionName - Name of the MongoDB collection
   * @param schema - Schema object created with Schema constructor
   * @returns Model instance
   */
  createModel(collectionName: string, schema: Schema): Model {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    if (!schema) {
      throw new Error('Schema is required');
    }
    
    // Log model creation if logger is available
    this.logger.debug(`Creating model for collection: ${collectionName}`);
    
    // Create a new Model instance with the MongoZen connection and logger
    return new Model(collectionName, schema, { 
      connection: this.connection, 
      logger: this.logger
    });
  }
}

// Export the MongoZen class as default export
export default MongoZen;
