const { expect } = require('chai');
const sinon = require('sinon');
const { isCompatibleLogger, LOG_LEVELS, ConsoleLogger } = require('../../src/logger');

describe('Logger', () => {
  let consoleErrorStub;
  let consoleWarnStub;
  let consoleLogStub;
  let originalConsole;

  beforeEach(() => {
    // Save original console methods
    originalConsole = {
      error: console.error,
      warn: console.warn,
      log: console.log
    };

    // Stub console methods
    consoleErrorStub = sinon.stub(console, 'error');
    consoleWarnStub = sinon.stub(console, 'warn');
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    // Restore console methods
    consoleErrorStub.restore();
    consoleWarnStub.restore();
    consoleLogStub.restore();
  });

  describe('ConsoleLogger', () => {
    it('should create a logger with default level', () => {
      const logger = new ConsoleLogger();
      
      expect(logger.level).to.equal('info');
      expect(logger.error).to.be.a('function');
      expect(logger.warn).to.be.a('function');
      expect(logger.info).to.be.a('function');
      expect(logger.debug).to.be.a('function');
      expect(logger.setLevel).to.be.a('function');
    });

    it('should create a logger with specified level', () => {
      const logger = new ConsoleLogger('debug');
      
      expect(logger.level).to.equal('debug');
    });

    it('should log error messages regardless of level', () => {
      const logger = new ConsoleLogger('error');
      logger.error('Test error message');
      
      expect(consoleErrorStub.calledOnce).to.be.true;
      expect(consoleErrorStub.firstCall.args[0]).to.include('[ERROR]: Test error message');
    });

    it('should log warn messages when level is warn or higher', () => {
      const warnLogger = new ConsoleLogger('warn');
      warnLogger.warn('Test warn message');
      
      expect(consoleWarnStub.calledOnce).to.be.true;
      
      // Reset the stub before testing the next logger
      consoleWarnStub.resetHistory();
      
      const errorLogger = new ConsoleLogger('error');
      errorLogger.warn('Test warn message');
      
      expect(consoleWarnStub.calledOnce).to.be.true; // Should be called once after reset
    });

    it('should log info messages when level is info or higher', () => {
      const infoLogger = new ConsoleLogger('info');
      infoLogger.info('Test info message');
      
      expect(consoleLogStub.calledOnce).to.be.true;
      
      // Reset the stub before testing the next logger
      consoleLogStub.resetHistory();
      
      const errorLogger = new ConsoleLogger('error');
      errorLogger.info('Test info message');
      
      expect(consoleLogStub.calledOnce).to.be.true; // Should be called once after reset
    });

    it('should log debug messages only when level is debug', () => {
      const debugLogger = new ConsoleLogger('debug');
      debugLogger.debug('Test debug message');
      
      expect(consoleLogStub.calledOnce).to.be.true;
      
      // Reset the stub before testing the next logger
      consoleLogStub.resetHistory();
      
      const infoLogger = new ConsoleLogger('info');
      infoLogger.debug('Test debug message');
      
      expect(consoleLogStub.called).to.be.false; // Should not be called for higher log levels
    });

    it('should allow changing log level', () => {
      const logger = new ConsoleLogger('info');
      
      // Initially won't log debug messages
      logger.debug('Test debug message');
      expect(consoleLogStub.called).to.be.false;
      
      // Change level to debug
      const result = logger.setLevel('debug');
      expect(result).to.be.true;
      expect(logger.level).to.equal('debug');
      
      logger.debug('Test debug message');
      expect(consoleLogStub.calledOnce).to.be.true;
    });

    it('should not change level if invalid level provided', () => {
      const logger = new ConsoleLogger('info');
      
      const result = logger.setLevel('invalid');
      expect(result).to.be.false;
      expect(logger.level).to.equal('info');
    });
  });

  describe('isCompatibleLogger', () => {
    it('should return true for compatible loggers', () => {
      const compatibleLogger = {
        error: () => {},
        warn: () => {},
        info: () => {},
        debug: () => {}
      };
      
      expect(isCompatibleLogger(compatibleLogger)).to.be.true;
      expect(isCompatibleLogger(new ConsoleLogger())).to.be.true;
    });

    it('should return false for incompatible loggers', () => {
      expect(isCompatibleLogger(null)).to.be.false;
      expect(isCompatibleLogger(undefined)).to.be.false;
      expect(isCompatibleLogger({})).to.be.false;
      expect(isCompatibleLogger({ error: () => {} })).to.be.false;
      expect(isCompatibleLogger({ log: () => {} })).to.be.false;
    });
  });

  describe('LOG_LEVELS', () => {
    it('should define correct log levels and priorities', () => {
      expect(LOG_LEVELS).to.deep.equal({
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
      });
    });
  });
});
