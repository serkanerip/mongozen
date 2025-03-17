import { expect } from 'chai';
import sinon from 'sinon';

import { Schema } from '../../src/schema.js';

describe('Schema', () => {
  let mockLogger: any;
  
  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      debug: sinon.spy(),
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy(),
      level: 'info'
    };
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('Constructor', () => {
    it('should create schema with valid definition', () => {
      const schema = new Schema({
        name: String,
        age: Number,
        isActive: Boolean
      });
      
      expect(schema).to.be.instanceOf(Schema);
      expect(schema.definition).to.have.property('name');
      expect(schema.definition).to.have.property('age');
      expect(schema.definition).to.have.property('isActive');
    });
    
    it('should throw error if definition is not provided', () => {
      expect(() => {
        // @ts-ignore - Testing with invalid params
        new Schema();
      }).to.throw('Schema definition is required');
    });
    
    it('should throw error if definition is not an object', () => {
      expect(() => {
        // @ts-ignore - Testing with invalid params
        new Schema('not an object');
      }).to.throw('Schema definition must be an object');
    });
    
    it('should create schema with expanded field definitions', () => {
      const schema = new Schema({
        name: { type: String, required: true },
        age: { type: Number, min: 18 },
        email: { 
          type: String, 
          validate: (value: string) => value.includes('@'),
          message: 'Invalid email format'
        }
      });
      
      expect(schema).to.be.instanceOf(Schema);
      expect(schema.definition.name).to.have.property('required', true);
    });
    
    it('should create schema with options', () => {
      const schema = new Schema(
        { name: String },
        { logger: mockLogger, strict: true }
      );
      
      expect(schema).to.be.instanceOf(Schema);
      expect(schema.getLogger()).to.equal(mockLogger);
      expect(schema.getOptions()).to.have.property('strict', true);
    });
    
    it('should log debug message if logger is provided', () => {
      new Schema({ name: String }, { logger: mockLogger });
      expect(mockLogger.debug.calledOnce).to.be.true;
      expect(mockLogger.debug.firstCall.args[0]).to.equal('Schema created');
    });
    
    it('should handle array type definitions', () => {
      const schema = new Schema({
        tags: [String],
        scores: [Number]
      });
      
      expect(schema.definition.tags).to.have.property('type', 'Array');
      expect(schema.definition.tags).to.have.property('arrayType', 'String');
      expect(schema.definition.scores).to.have.property('type', 'Array');
      expect(schema.definition.scores).to.have.property('arrayType', 'Number');
    });
    
    it('should handle object literals as nested schemas', () => {
      const schema = new Schema({
        metadata: { 
          createdAt: Date,
          updatedAt: Date
        }
      });
      
      expect(schema.definition.metadata).to.be.an('object');
      expect(schema.definition.metadata.createdAt).to.have.property('type', 'Date');
      expect(schema.definition.metadata.updatedAt).to.have.property('type', 'Date');
    });
    
    it('should throw error for invalid type', () => {
      expect(() => {
        new Schema({
          // @ts-ignore - Testing with invalid type
          field: 'InvalidType'
        });
      }).to.throw('Invalid type: InvalidType');
    });
    
    it('should throw error for non-function validate property', () => {
      expect(() => {
        new Schema({
          field: { 
            type: String, 
            // @ts-ignore - Testing with invalid validate
            validate: 'not a function' 
          }
        });
      }).to.throw('Validation function must be a function');
    });
    
    it('should throw error for non-boolean required property', () => {
      expect(() => {
        new Schema({
          field: { 
            type: String, 
            // @ts-ignore - Testing with invalid required
            required: 'not a boolean' 
          }
        });
      }).to.throw('Required property must be a boolean');
    });
    
    it('should throw error for null or undefined field definition', () => {
      expect(() => {
        new Schema({
          // @ts-ignore - Testing with null definition
          field: null
        });
      }).to.throw('Definition cannot be undefined or null');
      
      expect(() => {
        new Schema({
          // @ts-ignore - Testing with undefined definition
          field: undefined
        });
      }).to.throw('Definition cannot be undefined or null');
    });
  });
  
  describe('Type Validation', () => {
    it('should validate String type', () => {
      const schema = new Schema({ field: String });
      
      expect(schema.validate({ field: 'test' }).isValid).to.be.true;
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
      expect(schema.validate({ field: true }).isValid).to.be.false;
      expect(schema.validate({ field: new Date() }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
      expect(schema.validate({ field: [] }).isValid).to.be.false;
    });
    
    it('should validate Number type', () => {
      const schema = new Schema({ field: Number });
      
      expect(schema.validate({ field: 123 }).isValid).to.be.true;
      expect(schema.validate({ field: 0 }).isValid).to.be.true;
      expect(schema.validate({ field: -10.5 }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: true }).isValid).to.be.false;
      expect(schema.validate({ field: new Date() }).isValid).to.be.false;
      expect(schema.validate({ field: NaN }).isValid).to.be.false;
    });
    
    it('should validate Boolean type', () => {
      const schema = new Schema({ field: Boolean });
      
      expect(schema.validate({ field: true }).isValid).to.be.true;
      expect(schema.validate({ field: false }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: 1 }).isValid).to.be.false;
      expect(schema.validate({ field: 0 }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
    });
    
    it('should validate Date type', () => {
      const schema = new Schema({ field: Date });
      
      expect(schema.validate({ field: new Date() }).isValid).to.be.true;
      expect(schema.validate({ field: new Date('2023-01-01') }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
      expect(schema.validate({ field: true }).isValid).to.be.false;
      
      // Invalid date (NaN date)
      const invalidDate = new Date('invalid');
      expect(schema.validate({ field: invalidDate }).isValid).to.be.false;
    });
    
    it('should validate Array type', () => {
      const schema = new Schema({ field: Array });
      
      expect(schema.validate({ field: [] }).isValid).to.be.true;
      expect(schema.validate({ field: [1, 2, 3] }).isValid).to.be.true;
      expect(schema.validate({ field: ['a', 'b', 'c'] }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
    });
    
    it('should validate ObjectId type', () => {
      const schema = new Schema({ field: { type: 'ObjectId' } });
      
      expect(schema.validate({ field: '507f1f77bcf86cd799439011' }).isValid).to.be.true;
      expect(schema.validate({ field: '507f1f77bcf86cd7994390' }).isValid).to.be.false; // Too short
      expect(schema.validate({ field: '507f1f77bcf86cd79943901z' }).isValid).to.be.false; // Invalid char
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
    });
    
    it('should validate Buffer type', () => {
      const schema = new Schema({ field: { type: 'Buffer' } });
      
      expect(schema.validate({ field: Buffer.from('test') }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
    });
    
    it('should validate Map type', () => {
      const schema = new Schema({ field: { type: 'Map' } });
      
      expect(schema.validate({ field: new Map() }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
      expect(schema.validate({ field: [] }).isValid).to.be.false;
    });
    
    it('should validate BigInt type', () => {
      const schema = new Schema({ field: { type: 'BigInt' } });
      
      expect(schema.validate({ field: BigInt(123) }).isValid).to.be.true;
      expect(schema.validate({ field: 'test' }).isValid).to.be.false;
      expect(schema.validate({ field: 123 }).isValid).to.be.false;
      expect(schema.validate({ field: {} }).isValid).to.be.false;
    });
    
    it('should always validate Mixed type', () => {
      const schema = new Schema({ field: { type: 'Mixed' } });
      
      expect(schema.validate({ field: 'test' }).isValid).to.be.true;
      expect(schema.validate({ field: 123 }).isValid).to.be.true;
      expect(schema.validate({ field: true }).isValid).to.be.true;
      expect(schema.validate({ field: new Date() }).isValid).to.be.true;
      expect(schema.validate({ field: {} }).isValid).to.be.true;
      expect(schema.validate({ field: [] }).isValid).to.be.true;
      expect(schema.validate({ field: null }).isValid).to.be.true;
    });
  });
  
  describe('Required Field Validation', () => {
    it('should validate required fields', () => {
      const schema = new Schema({
        name: { type: String, required: true },
        age: Number
      });
      
      const validDoc = { name: 'John', age: 30 };
      const invalidDoc1 = { age: 30 }; // Missing required name
      const invalidDoc2 = { name: null, age: 30 }; // Null required name
      const invalidDoc3 = { name: undefined, age: 30 }; // Undefined required name
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(invalidDoc1).isValid).to.be.false;
      expect(schema.validate(invalidDoc2).isValid).to.be.false;
      expect(schema.validate(invalidDoc3).isValid).to.be.false;
    });
    
    it('should allow missing non-required fields', () => {
      const schema = new Schema({
        name: { type: String, required: true },
        age: { type: Number, required: false },
        email: String // Not required by default
      });
      
      const validDoc1 = { name: 'John', age: 30, email: 'john@example.com' };
      const validDoc2 = { name: 'John' }; // Missing non-required fields
      const validDoc3 = { name: 'John', age: null, email: undefined }; // Null/undefined non-required fields
      
      expect(schema.validate(validDoc1).isValid).to.be.true;
      expect(schema.validate(validDoc2).isValid).to.be.true;
      expect(schema.validate(validDoc3).isValid).to.be.true;
    });
  });
  
  describe('Custom Validation', () => {
    it('should validate with custom validators', () => {
      const schema = new Schema({
        email: { 
          type: String, 
          validate: (value: string) => value.includes('@'),
          message: 'Invalid email format'
        },
        age: {
          type: Number,
          validate: (value: number) => value >= 18 && value <= 100,
          message: 'Age must be between 18 and 100'
        }
      });
      
      const validDoc = { email: 'test@example.com', age: 30 };
      const invalidEmail = { email: 'invalid-email', age: 30 };
      const invalidAge = { email: 'test@example.com', age: 10 };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      
      const emailResult = schema.validate(invalidEmail);
      expect(emailResult.isValid).to.be.false;
      expect(emailResult.errors[0].message).to.equal('Invalid email format');
      
      const ageResult = schema.validate(invalidAge);
      expect(ageResult.isValid).to.be.false;
      expect(ageResult.errors[0].message).to.equal('Age must be between 18 and 100');
    });
    
    it('should use default error message if custom message is not provided', () => {
      const schema = new Schema({
        email: { 
          type: String, 
          validate: (value: string) => value.includes('@')
          // No custom message
        }
      });
      
      const result = schema.validate({ email: 'invalid-email' });
      expect(result.isValid).to.be.false;
      expect(result.errors[0].message).to.include('failed custom validation');
    });
    
    it('should handle validation function errors', () => {
      const schema = new Schema({
        field: { 
          type: String, 
          validate: () => { throw new Error('Validation error'); }
        }
      });
      
      const result = schema.validate({ field: 'test' });
      expect(result.isValid).to.be.false;
      expect(result.errors[0].message).to.equal('Validation error');
    });
  });
  
  describe('Default Values', () => {
    it('should apply static default values', () => {
      const schema = new Schema({
        name: String,
        age: { type: Number, default: 18 },
        isActive: { type: Boolean, default: true },
        tags: { type: Array, default: [] }
      });
      
      const doc = { name: 'John' };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.age).to.equal(18);
      expect(processed.isActive).to.be.true;
      expect(processed.tags).to.deep.equal([]);
    });
    
    it('should apply function default values', () => {
      // Store the current time for testing
      
      // Create a fixed date for testing
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      
      // Mock Date.now to return a fixed timestamp
      const originalNow = Date.now;
      Date.now = () => fixedDate.getTime();
      
      const schema = new Schema({
        name: String,
        createdAt: { type: Date, default: Date.now },
        uuid: { 
          type: String, 
          default: () => 'generated-id-123' 
        }
      });
      
      const doc = { name: 'John' };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.createdAt.getTime()).to.equal(fixedDate.getTime());
      expect(processed.uuid).to.equal('generated-id-123');
      
      // Restore original Date.now
      Date.now = originalNow;
    });
    
    it('should not override existing values with defaults', () => {
      const schema = new Schema({
        name: { type: String, default: 'Unknown' },
        age: { type: Number, default: 18 }
      });
      
      const doc = { name: 'John', age: 30 };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.age).to.equal(30);
    });
    
    it('should handle empty document', () => {
      const schema = new Schema({
        name: { type: String, default: 'Unknown' },
        createdAt: { type: Date, default: Date.now }
      });
      
      const processed = schema.applyDefaults();
      
      expect(processed.name).to.equal('Unknown');
      expect(processed.createdAt).to.be.instanceOf(Date);
    });
    
    it('should apply defaults to nested objects', () => {
      const schema = new Schema({
        name: String,
        favorites: {
          movie: { type: String, default: 'LOTR' },
          book: { type: String, default: 'The Hobbit' },
          food: { type: String }
        }
      });
      
      const doc = { name: 'John' };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.favorites).to.be.an('object');
      expect(processed.favorites.movie).to.equal('LOTR');
      expect(processed.favorites.book).to.equal('The Hobbit');
      expect(processed.favorites.food).to.be.undefined;
    });
    
    it('should apply function defaults to nested objects', () => {
      // Create a fixed date for testing
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      
      // Mock Date.now to return a fixed timestamp
      const originalNow = Date.now;
      Date.now = () => fixedDate.getTime();
      
      const schema = new Schema({
        name: String,
        metadata: {
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now },
          id: { type: String, default: () => 'ID-123' }
        }
      });
      
      const doc = { name: 'John' };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.metadata).to.be.an('object');
      expect(processed.metadata.createdAt.getTime()).to.equal(fixedDate.getTime());
      expect(processed.metadata.updatedAt.getTime()).to.equal(fixedDate.getTime());
      expect(processed.metadata.id).to.equal('ID-123');
      
      // Restore original Date.now
      Date.now = originalNow;
    });
    
    it('should not create empty nested objects when no defaults exist', () => {
      const schema = new Schema({
        name: String,
        preferences: {
          theme: { type: String },
          language: { type: String }
        }
      });
      
      const doc = { name: 'John' };
      const processed = schema.applyDefaults(doc);
      
      expect(processed.name).to.equal('John');
      expect(processed.preferences).to.be.undefined;
    });
  });
  
  describe('Complex Validation', () => {
    it('should validate nested objects', () => {
      const schema = new Schema({
        name: String,
        address: {
          street: { type: String, required: true },
          city: { type: String, required: true },
          zipCode: { type: String, pattern: /^\d{5}$/ }
        }
      });
      
      const validDoc = { 
        name: 'John', 
        address: { 
          street: '123 Main St', 
          city: 'Anytown', 
          zipCode: '12345' 
        } 
      };
      
      const missingStreet = { 
        name: 'John', 
        address: { 
          city: 'Anytown', 
          zipCode: '12345' 
        } 
      };
      
      const invalidZip = { 
        name: 'John', 
        address: { 
          street: '123 Main St', 
          city: 'Anytown', 
          zipCode: '1234' 
        } 
      };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(missingStreet).isValid).to.be.false;
      expect(schema.validate(invalidZip).isValid).to.be.false;
    });
    
    it('should validate with min/max constraints for numbers', () => {
      const schema = new Schema({
        age: { type: Number, min: 18, max: 100 },
        score: { type: Number, min: 0, max: 10 }
      });
      
      const validDoc = { age: 30, score: 8 };
      const tooYoung = { age: 15, score: 8 };
      const tooOld = { age: 110, score: 8 };
      const scoreTooLow = { age: 30, score: -1 };
      const scoreTooHigh = { age: 30, score: 11 };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(tooYoung).isValid).to.be.false;
      expect(schema.validate(tooOld).isValid).to.be.false;
      expect(schema.validate(scoreTooLow).isValid).to.be.false;
      expect(schema.validate(scoreTooHigh).isValid).to.be.false;
    });
    
    it('should validate with minLength/maxLength constraints for strings', () => {
      const schema = new Schema({
        username: { type: String, minLength: 3, maxLength: 20 },
        password: { type: String, minLength: 8, maxLength: 100 }
      });
      
      const validDoc = { username: 'johndoe', password: 'password123' };
      const usernameTooShort = { username: 'jo', password: 'password123' };
      const usernameTooLong = { username: 'a'.repeat(21), password: 'password123' };
      const passwordTooShort = { username: 'johndoe', password: 'pass' };
      const passwordTooLong = { username: 'johndoe', password: 'a'.repeat(101) };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(usernameTooShort).isValid).to.be.false;
      expect(schema.validate(usernameTooLong).isValid).to.be.false;
      expect(schema.validate(passwordTooShort).isValid).to.be.false;
      expect(schema.validate(passwordTooLong).isValid).to.be.false;
    });
    
    it('should validate enum values', () => {
      const schema = new Schema({
        status: { type: String, enum: ['active', 'inactive', 'pending'] },
        priority: { type: Number, enum: [1, 2, 3, 5, 8] }
      });
      
      const validDoc = { status: 'active', priority: 3 };
      const invalidStatus = { status: 'deleted', priority: 3 };
      const invalidPriority = { status: 'active', priority: 4 };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(invalidStatus).isValid).to.be.false;
      expect(schema.validate(invalidPriority).isValid).to.be.false;
    });
    
    it('should validate with regex pattern for strings', () => {
      const schema = new Schema({
        zipCode: { type: String, pattern: /^\d{5}$/ },
        phone: { type: String, pattern: /^\d{3}-\d{3}-\d{4}$/ }
      });
      
      const validDoc = { zipCode: '12345', phone: '123-456-7890' };
      const invalidZip = { zipCode: '1234', phone: '123-456-7890' };
      const invalidPhone = { zipCode: '12345', phone: '1234567890' };
      
      expect(schema.validate(validDoc).isValid).to.be.true;
      expect(schema.validate(invalidZip).isValid).to.be.false;
      expect(schema.validate(invalidPhone).isValid).to.be.false;
    });
  });
  
  describe('Getters and Setters', () => {
    it('should get logger instance', () => {
      const schema = new Schema({ name: String }, { logger: mockLogger });
      expect(schema.getLogger()).to.equal(mockLogger);
    });
    
    it('should get options', () => {
      const options = { logger: mockLogger, strict: true, custom: 'value' };
      const schema = new Schema({ name: String }, options);
      expect(schema.getOptions()).to.deep.equal(options);
    });
  });
});
