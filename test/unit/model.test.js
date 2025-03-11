const { expect } = require('chai');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Model = require('../../src/model');
const Schema = require('../../src/schema');

describe('Model', () => {
  let model;
  let mockCollection;
  let mockConnection;
  let mockSchema;
  let mockLogger;

  beforeEach(() => {
    // Create mock collection with all necessary methods
    mockCollection = {
      find: sinon.stub().returnsThis(),
      findOne: sinon.stub().resolves({}),
      project: sinon.stub().returnsThis(),
      sort: sinon.stub().returnsThis(),
      skip: sinon.stub().returnsThis(),
      limit: sinon.stub().returnsThis(),
      toArray: sinon.stub().resolves([]),
      insertOne: sinon.stub().resolves({ insertedId: new ObjectId() }),
      insertMany: sinon.stub().resolves({ insertedIds: { 0: new ObjectId(), 1: new ObjectId() } }),
      updateOne: sinon.stub().resolves({ acknowledged: true, matchedCount: 1, modifiedCount: 1 }),
      updateMany: sinon.stub().resolves({ acknowledged: true, matchedCount: 2, modifiedCount: 2 }),
      deleteOne: sinon.stub().resolves({ deletedCount: 1 }),
      deleteMany: sinon.stub().resolves({ deletedCount: 2 }),
      countDocuments: sinon.stub().resolves(5),
      aggregate: sinon.stub().returnsThis(),
      createIndex: sinon.stub().resolves('index_name')
    };

    // Create mock connection
    mockConnection = {
      getDb: sinon.stub().resolves({
        collection: sinon.stub().returns(mockCollection)
      })
    };

    // Create mock schema
    mockSchema = {
      validate: sinon.stub().returns({ isValid: true, errors: [] }),
      applyDefaults: sinon.stub().callsFake(doc => doc)
    };

    // Create mock logger
    mockLogger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };

    // Create model instance
    model = new Model('users', mockSchema, {
      connection: mockConnection,
      logger: mockLogger
    });
  });

  describe('constructor', () => {
    it('should create a model with valid parameters', () => {
      expect(model.collectionName).to.equal('users');
      expect(model.schema).to.equal(mockSchema);
      expect(model.connection).to.equal(mockConnection);
      expect(model.logger).to.equal(mockLogger);
      expect(mockLogger.debug.calledWith('Model created for collection: users')).to.be.true;
    });

    it('should throw error if collection name is not provided', () => {
      expect(() => new Model(null, mockSchema, { connection: mockConnection })).to.throw('Collection name is required');
    });

    it('should throw error if schema is not provided', () => {
      expect(() => new Model('users', null, { connection: mockConnection })).to.throw('Schema is required');
    });

    it('should throw error if connection is not provided', () => {
      expect(() => new Model('users', mockSchema, {})).to.throw('Connection instance is required');
    });
  });

  describe('toObjectId', () => {
    it('should convert string ID to ObjectId', () => {
      const id = '507f1f77bcf86cd799439011';
      const result = model.toObjectId(id);
      expect(result).to.be.instanceOf(ObjectId);
      expect(result.toString()).to.equal(id);
    });

    it('should return null for null or undefined ID', () => {
      expect(model.toObjectId(null)).to.be.null;
      expect(model.toObjectId(undefined)).to.be.null;
    });

    it('should return the same ObjectId if already an ObjectId', () => {
      const id = new ObjectId();
      const result = model.toObjectId(id);
      expect(result).to.equal(id);
    });
  });

  describe('prepareDocument', () => {
    it('should apply defaults and validate document', () => {
      const doc = { name: 'John Doe' };
      const result = model.prepareDocument(doc);
      
      expect(mockSchema.applyDefaults.calledWith(doc)).to.be.true;
      expect(mockSchema.validate.called).to.be.true;
      expect(result).to.deep.equal(doc);
    });

    it('should throw error if validation fails', () => {
      // Make validation fail
      mockSchema.validate.returns({
        isValid: false,
        errors: [{ message: 'Name is required' }]
      });

      expect(() => model.prepareDocument({})).to.throw('Validation failed: Name is required');
      expect(mockLogger.error.called).to.be.true;
    });
  });

  describe('getCollection', () => {
    it('should get collection from database', async () => {
      const collection = await model.getCollection();
      
      expect(mockConnection.getDb.called).to.be.true;
      expect(collection).to.equal(mockCollection);
    });
  });

  describe('find', () => {
    it('should find documents with query', async () => {
      const query = { age: { $gt: 18 } };
      const options = { projection: { name: 1 }, sort: { name: 1 }, skip: 10, limit: 20 };
      
      await model.find(query, options);
      
      expect(mockCollection.find.calledWith(query)).to.be.true;
      expect(mockCollection.project.calledWith(options.projection)).to.be.true;
      expect(mockCollection.sort.calledWith(options.sort)).to.be.true;
      expect(mockCollection.skip.calledWith(options.skip)).to.be.true;
      expect(mockCollection.limit.calledWith(options.limit)).to.be.true;
      expect(mockCollection.toArray.called).to.be.true;
    });

    it('should find documents with default options', async () => {
      await model.find();
      
      expect(mockCollection.find.calledWith({})).to.be.true;
      expect(mockCollection.project.called).to.be.false;
      expect(mockCollection.sort.called).to.be.false;
      expect(mockCollection.skip.called).to.be.false;
      expect(mockCollection.limit.called).to.be.false;
      expect(mockCollection.toArray.called).to.be.true;
    });
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      const id = '507f1f77bcf86cd799439011';
      const objectId = new ObjectId(id);
      
      await model.findById(id);
      
      expect(mockCollection.findOne.calledWith({ _id: sinon.match(val => val.toString() === objectId.toString()) })).to.be.true;
    });

    it('should return null for null ID', async () => {
      const result = await model.findById(null);
      
      expect(result).to.be.null;
      expect(mockCollection.findOne.called).to.be.false;
    });
  });

  describe('findOne', () => {
    it('should find one document with query and options', async () => {
      const query = { name: 'John Doe' };
      const options = { projection: { name: 1, email: 1 } };
      
      await model.findOne(query, options);
      
      expect(mockCollection.findOne.calledWith(query, options)).to.be.true;
    });

    it('should find one document with default options', async () => {
      await model.findOne({ name: 'John Doe' });
      
      expect(mockCollection.findOne.calledWith({ name: 'John Doe' }, {})).to.be.true;
    });
  });

  describe('count', () => {
    it('should count documents with query', async () => {
      const query = { age: { $gt: 18 } };
      
      await model.count(query);
      
      expect(mockCollection.countDocuments.calledWith(query)).to.be.true;
    });

    it('should count all documents with empty query', async () => {
      await model.count();
      
      expect(mockCollection.countDocuments.calledWith({})).to.be.true;
    });
  });

  describe('create', () => {
    it('should create a document', async () => {
      const doc = { name: 'John Doe', email: 'john@example.com' };
      const insertedId = new ObjectId();
      mockCollection.insertOne.resolves({ insertedId });
      
      const result = await model.create(doc);
      
      expect(mockCollection.insertOne.calledWith(doc)).to.be.true;
      expect(result).to.deep.include(doc);
      expect(result._id).to.equal(insertedId);
    });
  });

  describe('createMany', () => {
    it('should create multiple documents', async () => {
      const docs = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ];
      const insertedIds = {
        0: new ObjectId(),
        1: new ObjectId()
      };
      mockCollection.insertMany.resolves({ insertedIds });
      
      const result = await model.createMany(docs);
      
      expect(mockCollection.insertMany.calledWith(docs)).to.be.true;
      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]._id).to.equal(insertedIds[0]);
      expect(result[1]._id).to.equal(insertedIds[1]);
    });

    it('should throw error if docs is not an array', async () => {
      try {
        await model.createMany({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('createMany requires an array of documents');
      }
    });
  });

  describe('updateById', () => {
    it('should update document by ID', async () => {
      const id = '507f1f77bcf86cd799439011';
      const update = { name: 'Updated Name' };
      const options = { upsert: true };
      
      await model.updateById(id, update, options);
      
      expect(mockCollection.updateOne.calledWith(
        { _id: sinon.match.instanceOf(ObjectId) },
        { $set: update },
        options
      )).to.be.true;
    });

    it('should use update operators directly if provided', async () => {
      const id = '507f1f77bcf86cd799439011';
      const update = { $set: { name: 'Updated Name' }, $inc: { age: 1 } };
      
      await model.updateById(id, update);
      
      expect(mockCollection.updateOne.calledWith(
        { _id: sinon.match.instanceOf(ObjectId) },
        update,
        {}
      )).to.be.true;
    });

    it('should throw error if ID is not provided', async () => {
      try {
        await model.updateById(null, { name: 'Updated Name' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('ID is required for updateById');
      }
    });
  });

  describe('updateOne', () => {
    it('should update one document', async () => {
      const filter = { name: 'John Doe' };
      const update = { email: 'updated@example.com' };
      const options = { upsert: true };
      
      await model.updateOne(filter, update, options);
      
      expect(mockCollection.updateOne.calledWith(
        filter,
        { $set: update },
        options
      )).to.be.true;
    });

    it('should use update operators directly if provided', async () => {
      const filter = { name: 'John Doe' };
      const update = { $set: { email: 'updated@example.com' }, $inc: { loginCount: 1 } };
      
      await model.updateOne(filter, update);
      
      expect(mockCollection.updateOne.calledWith(
        filter,
        update,
        {}
      )).to.be.true;
    });
  });

  describe('updateMany', () => {
    it('should update multiple documents', async () => {
      const filter = { age: { $gt: 18 } };
      const update = { status: 'active' };
      const options = { upsert: false };
      
      await model.updateMany(filter, update, options);
      
      expect(mockCollection.updateMany.calledWith(
        filter,
        { $set: update },
        options
      )).to.be.true;
    });

    it('should use update operators directly if provided', async () => {
      const filter = { age: { $gt: 18 } };
      const update = { $set: { status: 'active' }, $inc: { loginCount: 1 } };
      
      await model.updateMany(filter, update);
      
      expect(mockCollection.updateMany.calledWith(
        filter,
        update,
        {}
      )).to.be.true;
    });
  });

  describe('deleteById', () => {
    it('should delete document by ID', async () => {
      const id = '507f1f77bcf86cd799439011';
      mockCollection.deleteOne.resolves({ deletedCount: 1 });
      
      const result = await model.deleteById(id);
      
      expect(mockCollection.deleteOne.calledWith({ _id: sinon.match.instanceOf(ObjectId) })).to.be.true;
      expect(result).to.be.true;
    });

    it('should return false if no document was deleted', async () => {
      const id = '507f1f77bcf86cd799439011';
      mockCollection.deleteOne.resolves({ deletedCount: 0 });
      
      const result = await model.deleteById(id);
      
      expect(result).to.be.false;
    });

    it('should return false for null ID', async () => {
      const result = await model.deleteById(null);
      
      expect(result).to.be.false;
      expect(mockCollection.deleteOne.called).to.be.false;
    });
  });

  describe('deleteOne', () => {
    it('should delete one document', async () => {
      const filter = { name: 'John Doe' };
      mockCollection.deleteOne.resolves({ deletedCount: 1 });
      
      const result = await model.deleteOne(filter);
      
      expect(mockCollection.deleteOne.calledWith(filter)).to.be.true;
      expect(result).to.be.true;
    });

    it('should return false if no document was deleted', async () => {
      const filter = { name: 'John Doe' };
      mockCollection.deleteOne.resolves({ deletedCount: 0 });
      
      const result = await model.deleteOne(filter);
      
      expect(result).to.be.false;
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple documents', async () => {
      const filter = { age: { $lt: 18 } };
      mockCollection.deleteMany.resolves({ deletedCount: 5 });
      
      const result = await model.deleteMany(filter);
      
      expect(mockCollection.deleteMany.calledWith(filter)).to.be.true;
      expect(result).to.equal(5);
    });
  });

  describe('aggregate', () => {
    it('should perform aggregation', async () => {
      const pipeline = [
        { $match: { age: { $gt: 18 } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ];
      const options = { allowDiskUse: true };
      
      await model.aggregate(pipeline, options);
      
      expect(mockCollection.aggregate.calledWith(pipeline, options)).to.be.true;
      expect(mockCollection.toArray.called).to.be.true;
    });
  });

  describe('createIndex', () => {
    it('should create an index', async () => {
      const keys = { name: 1, email: 1 };
      const options = { unique: true };
      
      await model.createIndex(keys, options);
      
      expect(mockCollection.createIndex.calledWith(keys, options)).to.be.true;
    });
  });
});
