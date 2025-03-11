const { ObjectId } = require('mongodb');

/**
 * Model class for MongoDB collections with schema validation
 */
class Model {
  /**
   * Create a new Model instance
   * @param {string} collectionName - Name of the MongoDB collection
   * @param {Object} schema - Schema object created with Schema constructor
   * @param {Object} options - Options for the model
   */
  constructor(collectionName, schema, options = {}) {
    if (!collectionName) {
      throw new Error('Collection name is required');
    }
    
    if (!schema) {
      throw new Error('Schema is required');
    }
    
    // Store instance options
    this.options = options;
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
   * @param {string|ObjectId} id - ID to convert
   * @returns {ObjectId|null} - ObjectId instance or null
   */
  toObjectId(id) {
    if (!id) return null;
    return typeof id === 'string' ? new ObjectId(id) : id;
  }
  
  /**
   * Helper to prepare a document before saving
   * @param {Object} doc - Document to prepare
   * @returns {Object} - Prepared document
   */
  prepareDocument(doc) {
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
   * @returns {Promise<Object>} - MongoDB collection
   */
  async getCollection() {
    const db = await this.connection.getDb();
    return db.collection(this.collectionName);
  }
  
  /**
   * Find documents in the collection
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (projection, sort, limit, skip)
   * @returns {Promise<Array>} - Array of documents
   */
  async find(query = {}, options = {}) {
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
   * @param {string|ObjectId} id - Document ID
   * @returns {Promise<Object|null>} - Document or null if not found
   */
  async findById(id) {
    if (!id) return null;
    
    const collection = await this.getCollection();
    return collection.findOne({ _id: this.toObjectId(id) });
  }
  
  /**
   * Find a single document by query
   * @param {Object} query - MongoDB query
   * @param {Object} options - Query options (projection)
   * @returns {Promise<Object|null>} - Document or null if not found
   */
  async findOne(query = {}, options = {}) {
    const collection = await this.getCollection();
    return collection.findOne(query, options);
  }
  
  /**
   * Count documents in the collection
   * @param {Object} query - MongoDB query
   * @returns {Promise<number>} - Count of matching documents
   */
  async count(query = {}) {
    const collection = await this.getCollection();
    return collection.countDocuments(query);
  }
  
  /**
   * Create a new document
   * @param {Object} doc - Document to create
   * @returns {Promise<Object>} - Created document
   */
  async create(doc) {
    const collection = await this.getCollection();
    const preparedDoc = this.prepareDocument(doc);
    
    const result = await collection.insertOne(preparedDoc);
    return { ...preparedDoc, _id: result.insertedId };
  }
  
  /**
   * Create multiple documents
   * @param {Array} docs - Array of documents to create
   * @returns {Promise<Array>} - Array of created documents
   */
  async createMany(docs) {
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
   * @param {string|ObjectId} id - Document ID
   * @param {Object} update - Update operations or replacement document
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Update result
   */
  async updateById(id, update, options = {}) {
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
   * @param {Object} filter - Filter to find the document
   * @param {Object} update - Update operations
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Update result
   */
  async updateOne(filter, update, options = {}) {
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
   * @param {Object} filter - Filter to find documents
   * @param {Object} update - Update operations
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Update result
   */
  async updateMany(filter, update, options = {}) {
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
   * @param {string|ObjectId} id - Document ID
   * @returns {Promise<boolean>} - True if document was deleted
   */
  async deleteById(id) {
    if (!id) return false;
    
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ _id: this.toObjectId(id) });
    
    return result.deletedCount > 0;
  }
  
  /**
   * Delete a single document
   * @param {Object} filter - Filter to find the document
   * @returns {Promise<boolean>} - True if document was deleted
   */
  async deleteOne(filter) {
    const collection = await this.getCollection();
    const result = await collection.deleteOne(filter);
    
    return result.deletedCount > 0;
  }
  
  /**
   * Delete multiple documents
   * @param {Object} filter - Filter to find documents
   * @returns {Promise<number>} - Number of deleted documents
   */
  async deleteMany(filter) {
    const collection = await this.getCollection();
    const result = await collection.deleteMany(filter);
    
    return result.deletedCount;
  }
  
  /**
   * Perform aggregation on the collection
   * @param {Array} pipeline - Aggregation pipeline
   * @param {Object} options - Aggregation options
   * @returns {Promise<Array>} - Aggregation results
   */
  async aggregate(pipeline, options = {}) {
    const collection = await this.getCollection();
    return collection.aggregate(pipeline, options).toArray();
  }
  
  /**
   * Create an index on the collection
   * @param {Object} keys - Index keys
   * @param {Object} options - Index options
   * @returns {Promise<string>} - Index name
   */
  async createIndex(keys, options = {}) {
    const collection = await this.getCollection();
    return collection.createIndex(keys, options);
  }
}

module.exports = Model;
