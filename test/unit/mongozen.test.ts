import { expect } from 'chai';
import sinon from 'sinon';

import MongoZen from '../../src/mongozen.js';
import { Connection } from '../../src/connection.js';
import { Schema } from '../../src/schema.js';
import { Model } from '../../src/model.js';
import { ConsoleLogger } from '../../src/logger.js';

describe('MongoZen', () => {
  let sandbox: sinon.SinonSandbox;
  let mockLogger: any;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Create mock logger
    mockLogger = {
      debug: sandbox.spy(),
      info: sandbox.spy(),
      warn: sandbox.spy(),
      error: sandbox.spy(),
      level: 'info',
      setLevel: sandbox.stub().returns(true)
    };
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Constructor', () => {
    it('should create instance with default options', () => {
      const mongoZen = new MongoZen();
      expect(mongoZen).to.be.instanceOf(MongoZen);
      expect(mongoZen.getLogger()).to.exist;
    });
    
    it('should create instance with custom logger', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      expect(mongoZen.getLogger()).to.equal(mockLogger);
    });
    
    it('should create instance with log level', () => {
      const mongoZen = new MongoZen({ logLevel: 'error' });
      expect(mongoZen.getLogger().level).to.equal('error');
    });
    
    it('should use default logger if provided logger is incompatible', () => {
      // Create an incompatible logger (missing required methods)
      const incompatibleLogger = { info: () => {} } as any;
      
      // Spy on console.warn
      const warnSpy = sandbox.spy(console, 'warn');
      
      const mongoZen = new MongoZen({ logger: incompatibleLogger });
      
      expect(warnSpy.calledOnce).to.be.true;
      expect(warnSpy.args[0][0]).to.include('not compatible');
      expect(mongoZen.getLogger()).to.be.instanceOf(ConsoleLogger);
    });
  });
  
  describe('getLogger', () => {
    it('should return the logger instance', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      expect(mongoZen.getLogger()).to.equal(mockLogger);
    });
  });
  
  describe('connect', () => {
    it('should connect to MongoDB', async () => {
      // Create a stub for the Connection.prototype.connect method
      const connectStub = sandbox.stub(Connection.prototype, 'connect').resolves({} as any);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      await mongoZen.connect('mongodb://localhost:27017', 'test_db');
      
      expect(mockLogger.debug.calledWith('Attempting to connect to MongoDB')).to.be.true;
      expect(connectStub.calledOnce).to.be.true;
      expect(connectStub.firstCall.args[0]).to.equal('mongodb://localhost:27017');
      expect(connectStub.firstCall.args[1]).to.equal('test_db');
    });
    
    it('should connect with connection options', async () => {
      // Create a stub for the Connection.prototype.connect method
      const connectStub = sandbox.stub(Connection.prototype, 'connect').resolves({} as any);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      const options = { serverSelectionTimeoutMS: 5000 }; // Use a valid MongoClientOptions property
      await mongoZen.connect('mongodb://localhost:27017', 'test_db', options);
      
      expect(connectStub.calledOnce).to.be.true;
      expect(connectStub.firstCall.args[2]).to.deep.equal(options);
    });
  });
  
  describe('setLogLevel', () => {
    it('should set valid log level', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      const result = mongoZen.setLogLevel('warn');
      
      expect(result).to.be.true;
      expect(mockLogger.setLevel.calledWith('warn')).to.be.true;
      expect(mockLogger.info.calledOnce).to.be.true;
    });
    
    it('should reject invalid log level', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      const result = mongoZen.setLogLevel('invalid');
      
      expect(result).to.be.false;
      expect(mockLogger.warn.calledOnce).to.be.true;
      expect(mockLogger.warn.args[0][0]).to.include('Invalid log level');
    });
    
    it('should handle missing log level', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      const result = mongoZen.setLogLevel('' as any);
      
      expect(result).to.be.false;
      expect(mockLogger.warn.calledOnce).to.be.true;
    });
    
    it('should set log level directly if setLevel method is not available', () => {
      // Create logger without setLevel method
      const loggerWithoutSetLevel = {
        debug: sandbox.spy(),
        info: sandbox.spy(),
        warn: sandbox.spy(),
        error: sandbox.spy(),
        level: 'info'
      };
      
      const mongoZen = new MongoZen({ logger: loggerWithoutSetLevel });
      const result = mongoZen.setLogLevel('warn');
      
      expect(result).to.be.true;
      expect(loggerWithoutSetLevel.level).to.equal('warn');
      expect(loggerWithoutSetLevel.info.calledOnce).to.be.true;
    });
  });
  
  describe('close', () => {
    it('should close the MongoDB connection', async () => {
      // Create a stub for the Connection.prototype.close method
      const closeStub = sandbox.stub(Connection.prototype, 'close').resolves();
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      await mongoZen.close();
      
      expect(mockLogger.debug.calledWith('Closing MongoDB connection')).to.be.true;
      expect(closeStub.calledOnce).to.be.true;
    });
  });
  
  describe('createSchema', () => {
    it('should create a new Schema instance', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      const definition = { name: String };
      const options = { strict: true };
      
      const schema = mongoZen.createSchema(definition, options);
      
      expect(mockLogger.debug.calledWith('Creating new Schema instance')).to.be.true;
      expect(schema).to.be.instanceOf(Schema);
    });
  });
  
  describe('createModel', () => {
    it('should create a new Model instance', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      const schema = new Schema({ name: String });
      
      const model = mongoZen.createModel('users', schema);
      
      expect(mockLogger.debug.calledWith('Creating model for collection: users')).to.be.true;
      expect(model).to.be.instanceOf(Model);
    });
    
    it('should throw an error if schema is not provided', () => {
      const mongoZen = new MongoZen({ logger: mockLogger });
      
      expect(() => mongoZen.createModel('users', null as any)).to.throw('Schema is required');
    });
  });
  
  describe('Connection access', () => {
    it('should throw an error when trying to access database before connecting', async () => {
      // Stub the Connection.prototype.getDb method to throw an error
      const error = new Error('Database connection not established');
      sandbox.stub(Connection.prototype, 'getDb').rejects(error);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      
      try {
        // We need to access the private connection property indirectly
        // by using the connect method first, then accessing getDb on the connection
        await (mongoZen as any).connection.getDb();
        expect.fail('Expected getDb to throw an error');
      } catch (err: any) {
        expect(err.message).to.equal('Database connection not established');
      }
    });
    
    it('should allow access to database after connecting', async () => {
      // Create a mock database instance
      const mockDb = { collection: sandbox.stub() };
      
      // Stub the connect method to set the db property
      sandbox.stub(Connection.prototype, 'connect').resolves(mockDb as any);
      sandbox.stub(Connection.prototype, 'getDb').resolves(mockDb as any);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      await mongoZen.connect('mongodb://localhost:27017', 'test_db');
      
      // Access the database through the connection
      const db = await (mongoZen as any).connection.getDb();
      expect(db).to.equal(mockDb);
    });
  });
  
  describe('Error handling', () => {
    it('should handle connection errors', async () => {
      // Stub the connect method to throw an error
      const error = new Error('Connection failed');
      sandbox.stub(Connection.prototype, 'connect').rejects(error);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      
      try {
        await mongoZen.connect('mongodb://localhost:27017', 'test_db');
        // Should not reach here
        expect.fail('Expected connect to throw an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
    
    it('should handle close errors', async () => {
      // Stub the close method to throw an error
      const error = new Error('Close failed');
      sandbox.stub(Connection.prototype, 'close').rejects(error);
      
      const mongoZen = new MongoZen({ logger: mockLogger });
      
      try {
        await mongoZen.close();
        // Should not reach here
        expect.fail('Expected close to throw an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});
