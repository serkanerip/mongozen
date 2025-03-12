import { Collection, Document, ObjectId } from 'mongodb';
import { Schema } from './schema.js';
import { Logger, ModelOptions, QueryOptions, UpdateOptions, AggregationOptions } from './types.js';

/**
 * Model class for MongoDB collections with schema validation
 */
export class Model {
  private collectionName: string;
  private schema: Schema;
  private logger?: Logger;
  private connection: any;

  /**
   * Create a new Model instance
   * @param collectionName - Name of the MongoDB collection
   * @param schema - Schema object created with Schema constructor
   * @param options - Options for the model
   */
  constructor(collectionName: string, schema: Schema, options: ModelOptions = {}) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    if (!schema) {
      throw new Error('Schema is required');
    }
    
    // Store instance options
    this.collectionName = collectionName;
    this.schema = schema;
    
    // Use the provided logger
    this.logger = options.logger;
    
    // Store the connection instance
    this.connection = options.connection;
    
    if (!this.connection) {
      throw new Error('Connection instance is required');
    }
    
    // Log model creation if logger is available
    if (this.logger) {
      this.logger.debug(`Model created for collection: ${this.collectionName}`);
    }
  }
  
  /**
   * Helper to convert string IDs to ObjectId
   * @param id - ID to convert
   * @returns ObjectId instance
   */
  toObjectId(id: string | ObjectId): ObjectId {
    return typeof id === 'string' ? new ObjectId(id) : id;
  }
  
  /**
   * Helper to prepare a document before saving
   * @param doc - Document to prepare
   * @returns Prepared document
   */
  prepareDocument(doc: Record<string, any>): Record<string, any> {
    // Apply defaults
    const preparedDoc = this.schema.applyDefaults(doc);
    
    // Validate the document
    const validation = this.schema.validate(preparedDoc);
    if (!validation.isValid) {
      const errorMessage = validation.errors.map(err => err.message).join(', ');
      if (this.logger) {
        this.logger.error(`Validation failed for ${this.collectionName}: ${errorMessage}`);
      }
      throw new Error(`Validation failed: ${errorMessage}`);
    }
    
    if (this.logger) {
      this.logger.debug(`Document prepared for ${this.collectionName}`);
    }
    return preparedDoc;
  }
  
  /**
   * Get the collection from the database
   * @returns MongoDB collection
   */
  async getCollection(): Promise<Collection> {
    const db = await this.connection.getDb();
    return db.collection(this.collectionName);
  }
  
  /**
   * Find documents in the collection
   * @param query - MongoDB query
   * @param options - Query options (projection, sort, limit, skip)
   * @returns Array of documents
   */
  async find(query: Document = {}, options: QueryOptions = {}): Promise<Document[]> {
    const collection = await this.getCollection();
    const { projection, sort, limit, skip } = options;
    
    let cursor = collection.find(query);
    
    if (projection) cursor = cursor.project(projection);
    if (sort) cursor = cursor.sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);
    
    return cursor.toArray();
  }
  
  /**
   * Find a single document by ID
   * @param id - Document ID
   * @returns Document or null if not found
   */
  async findById(id: string | ObjectId): Promise<Document | null> {
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(id) });
  }
  
  /**
   * Find a single document by query
   * @param query - MongoDB query
   * @param options - Query options (projection)
   * @returns Document or null if not found
   */
  async findOne(query: Document = {}, options: QueryOptions = {}): Promise<Document | null> {
    const collection = await this.getCollection();
    return collection.findOne(query, options);
  }
  
  /**
   * Count documents in the collection
   * @param query - MongoDB query
   * @returns Count of matching documents
   */
  async count(query: Document = {}): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(query);
  }
  
  /**
   * Create a new document
   * @param doc - Document to create
   * @returns Created document
   */
  async create(doc: Record<string, any>): Promise<Document> {
    const collection = await this.getCollection();
    const preparedDoc = this.prepareDocument(doc);
    
    const result = await collection.insertOne(preparedDoc);
    return { ...preparedDoc, _id: result.insertedId };
  }
  
  /**
   * Create multiple documents
   * @param docs - Array of documents to create
   * @returns Array of created documents
   */
  async createMany(docs: Record<string, any>[]): Promise<Document[]> {
    if (!Array.isArray(docs)) {
      throw new Error('createMany requires an array of documents');
    }
    
    const collection = await this.getCollection();
    const preparedDocs = docs.map(doc => this.prepareDocument(doc));
    
    const result = await collection.insertMany(preparedDocs);
    
    // Add the generated _ids to the documents
    return preparedDocs.map((doc, index) => {
      return { ...doc, _id: result.insertedIds[index] };
    });
  }
  
  /**
   * Update a document by ID
   * @param id - Document ID
   * @param update - Update operations or replacement document
   * @param options - Update options
   * @returns Update result
   */
  async updateById(id: string | ObjectId, update: Document, options: UpdateOptions = {}): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedId: ObjectId | null;
  }> {
    if (!id) throw new Error('ID is required for updateById');
    
    const collection = await this.getCollection();
    const objectId = this.toObjectId(id);
    
    // If update doesn't use operators like $set, wrap it in $set
    const hasOperators = Object.keys(update).some(key => key.startsWith('$'));
    const updateOp = hasOperators ? update : { $set: update };
    
    const result = await collection.updateOne(
      { _id: objectId },
      updateOp,
      options
    );
    
    return {
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    };
  }
  
  /**
   * Update a single document
   * @param filter - Filter to find the document
   * @param update - Update operations
   * @param options - Update options
   * @returns Update result
   */
  async updateOne(filter: Document, update: Document, options: UpdateOptions = {}): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedId: ObjectId | null;
  }> {
    const collection = await this.getCollection();
    
    // If update doesn't use operators like $set, wrap it in $set
    const hasOperators = Object.keys(update).some(key => key.startsWith('$'));
    const updateOp = hasOperators ? update : { $set: update };
    
    const result = await collection.updateOne(filter, updateOp, options);
    
    return {
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    };
  }
  
  /**
   * Update multiple documents
   * @param filter - Filter to find documents
   * @param update - Update operations
   * @param options - Update options
   * @returns Update result
   */
  async updateMany(filter: Document, update: Document, options: UpdateOptions = {}): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedId: ObjectId | null;
  }> {
    const collection = await this.getCollection();
    
    // If update doesn't use operators like $set, wrap it in $set
    const hasOperators = Object.keys(update).some(key => key.startsWith('$'));
    const updateOp = hasOperators ? update : { $set: update };
    
    const result = await collection.updateMany(filter, updateOp, options);
    
    return {
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId
    };
  }
  
  /**
   * Delete a document by ID
   * @param id - Document ID
   * @returns True if document was deleted
   */
  async deleteById(id: string | ObjectId): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    
    return result.deletedCount > 0;
  }
  
  /**
   * Delete a single document
   * @param filter - Filter to find the document
   * @returns True if document was deleted
   */
  async deleteOne(filter: Document): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne(filter);
    
    return result.deletedCount > 0;
  }
  
  /**
   * Delete multiple documents
   * @param filter - Filter to find documents
   * @returns Number of deleted documents
   */
  async deleteMany(filter: Document): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany(filter);
    
    return result.deletedCount;
  }
  
  /**
   * Perform aggregation on the collection
   * @param pipeline - Aggregation pipeline
   * @param options - Aggregation options
   * @returns Aggregation results
   */
  async aggregate(pipeline: Document[], options: AggregationOptions = {}): Promise<Document[]> {
    const collection = await this.getCollection();
    return collection.aggregate(pipeline, options).toArray();
  }
  
  /**
   * Create an index on the collection
   * @param keys - Index keys
   * @param options - Index options
   * @returns Index name
   */
  async createIndex(keys: Document, options: Record<string, any> = {}): Promise<string> {
    const collection = await this.getCollection();
    return collection.createIndex(keys, options);
  }
}
