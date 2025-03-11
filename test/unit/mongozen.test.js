const { expect } = require('chai');
const sinon = require('sinon');
const MongoZen = require('../../src/index');
const Connection = require('../../src/connection');
const Schema = require('../../src/schema');
const Model = require('../../src/model');

describe('MongoZen', () => {
  let mongoZen;
  let mockLogger;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
      level: 'info'
    };

    // Create a MongoZen instance with mock logger
    mongoZen = new MongoZen({
      logger: mockLogger,
      logLevel: 'debug'
    });
  });

  describe('constructor', () => {
    it('should create a MongoZen instance with default options', () => {
      const defaultMongoZen = new MongoZen();
      expect(defaultMongoZen.options).to.be.an('object');
      expect(defaultMongoZen.logger).to.exist;
    });

    it('should create a MongoZen instance with provided options', () => {
      expect(mongoZen.options.logger).to.equal(mockLogger);
      expect(mongoZen.logger).to.equal(mockLogger);
      expect(mongoZen.logger.level).to.equal('debug');
    });
  });

  describe('createConnection', () => {
    it('should create a Connection instance', () => {
      const connectionStub = sinon.stub(Connection.prototype, 'connect').resolves();
      
      const connection = mongoZen.createConnection({
        uri: 'mongodb://localhost:27017',
        dbName: 'test_db'
      });

      expect(connection).to.be.instanceOf(Connection);
      expect(connection.options.uri).to.equal('mongodb://localhost:27017');
      expect(connection.options.dbName).to.equal('test_db');
      expect(connection.logger).to.equal(mockLogger);

      connectionStub.restore();
    });
  });

  describe('createSchema', () => {
    it('should create a Schema instance', () => {
      const definition = {
        name: String,
        age: Number,
        isActive: Boolean
      };

      const schema = mongoZen.createSchema(definition);

      expect(schema).to.be.instanceOf(Schema);
      expect(schema.originalDefinition).to.deep.equal(definition);
    });
  });

  describe('createModel', () => {
    it('should create a Model instance', () => {
      // Create a mock connection and schema
      const mockSchema = {};

      const model = mongoZen.createModel('users', mockSchema);

      expect(model).to.be.instanceOf(Model);
      expect(model.collectionName).to.equal('users');
      expect(model.connection).to.equal(mongoZen.connection);
      expect(model.schema).to.equal(mockSchema);
      expect(model.logger).to.equal(mockLogger);
    });
  });
});
