const { expect } = require('chai');
const sinon = require('sinon');
const { MongoClient } = require('mongodb');
const Connection = require('../../src/connection');

describe('Connection', () => {
  let connection;
  let mockLogger;
  let mongoClientConnectStub;
  let mongoClientCloseStub;

  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };

    // Stub MongoClient.connect
    mongoClientConnectStub = sinon.stub(MongoClient.prototype, 'connect').resolves();
    mongoClientCloseStub = sinon.stub(MongoClient.prototype, 'close').resolves();

    // Create a connection instance with mock logger
    connection = new Connection(mockLogger);
  });

  afterEach(() => {
    // Restore stubs
    mongoClientConnectStub.restore();
    mongoClientCloseStub.restore();
  });

  describe('constructor', () => {
    it('should create a connection with no logger', () => {
      const defaultConnection = new Connection();
      expect(defaultConnection.client).to.be.null;
      expect(defaultConnection.db).to.be.null;
      expect(defaultConnection.isConnected).to.be.false;
      expect(defaultConnection.logger).to.be.null;
    });

    it('should create a connection with provided logger', () => {
      expect(connection.client).to.be.null;
      expect(connection.db).to.be.null;
      expect(connection.isConnected).to.be.false;
      expect(connection.logger).to.equal(mockLogger);
    });
  });

  describe('connect', () => {
    it('should connect to MongoDB', async () => {
      // Create a mock db object
      const mockDb = { name: 'test_db' };
      
      // Stub the MongoClient.prototype.db method to return our mock db
      const dbStub = sinon.stub().returns(mockDb);
      
      // Set up the MongoClient to use our stub
      MongoClient.prototype.db = dbStub;

      const uri = 'mongodb://localhost:27017';
      const dbName = 'test_db';
      const result = await connection.connect(uri, dbName);

      expect(mongoClientConnectStub.calledOnce).to.be.true;
      expect(mockLogger.info.calledWith('Connected to MongoDB database: test_db')).to.be.true;
      expect(connection.isConnected).to.be.true;
      expect(dbStub.calledWith(dbName)).to.be.true;
      expect(result).to.equal(mockDb);
    });

    it('should handle connection errors', async () => {
      // Make connect throw an error
      mongoClientConnectStub.rejects(new Error('Connection failed'));

      try {
        await connection.connect('mongodb://localhost:27017', 'test_db');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Connection failed');
        expect(mockLogger.error.calledWith('Failed to connect to MongoDB: Connection failed')).to.be.true;
        expect(connection.isConnected).to.be.false;
      }
    });

    it('should throw error if uri is not provided', async () => {
      try {
        await connection.connect();
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('MongoDB connection URI is required');
        expect(connection.isConnected).to.be.false;
      }
    });
    
    it('should throw error if dbName is not provided', async () => {
      try {
        await connection.connect('mongodb://localhost:27017');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Database name is required');
        expect(connection.isConnected).to.be.false;
      }
    });
  });

  describe('getDb', () => {
    it('should return the db instance if connected', async () => {
      // Set up a mock db
      const mockDb = { name: 'test_db' };
      connection.db = mockDb;
      connection.isConnected = true;

      const result = await connection.getDb();

      expect(result).to.equal(mockDb);
    });

    it('should throw error if not connected and no connection parameters are available', async () => {
      connection.isConnected = false;
      
      try {
        await connection.getDb();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('MongoDB connection URI is required');
      }
    });
  });

  describe('close', () => {
    it('should close the connection if connected', async () => {
      // Set up as connected
      connection.client = new MongoClient('mongodb://localhost:27017');
      connection.isConnected = true;

      await connection.close();

      expect(mongoClientCloseStub.calledOnce).to.be.true;
      expect(mockLogger.info.calledWith('MongoDB connection closed')).to.be.true;
      expect(connection.client).to.be.null;
      expect(connection.db).to.be.null;
    });

    it('should do nothing if not connected', async () => {
      // Set up as not connected
      connection.client = null;
      connection.isConnected = false;

      await connection.close();

      expect(mongoClientCloseStub.called).to.be.false;
    });

    it('should handle errors when closing', async () => {
      // Set up as connected but make close throw an error
      connection.client = new MongoClient('mongodb://localhost:27017');
      connection.isConnected = true;
      mongoClientCloseStub.rejects(new Error('Close failed'));

      try {
        await connection.close();
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Close failed');
        expect(mockLogger.error.calledWith('Failed to connect to MongoDB: Close failed')).to.be.false;
      }
    });
  });
});
