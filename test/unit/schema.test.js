const { expect } = require('chai');
const Schema = require('../../src/schema');

describe('Schema', () => {
  describe('constructor', () => {
    it('should create a schema with valid definition', () => {
      const schema = new Schema({
        name: String,
        age: Number,
        isActive: Boolean,
        tags: [String],
        metadata: Object,
      });

      expect(schema).to.be.an('object');
      expect(schema.definition).to.be.an('object');
    });

    it('should throw an error if definition is not provided', () => {
      expect(() => new Schema()).to.throw('Schema definition is required');
    });
  });

  describe('validate', () => {
    let schema;

    beforeEach(() => {
      schema = new Schema({
        name: { type: String, required: true },
        age: { type: Number, min: 18, max: 100 },
        email: { type: String, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        isActive: Boolean,
        tags: [String],
        metadata: Object,
        createdAt: { type: Date, default: Date.now }
      });
    });

    it('should validate a valid document', () => {
      const doc = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['user', 'admin'],
        metadata: { role: 'admin' }
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.an('array');
      expect(result.errors).to.be.empty;
    });

    it('should fail validation for missing required field', () => {
      const doc = {
        age: 30,
        email: 'john@example.com'
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors).to.not.be.empty;
      expect(result.errors[0].message).to.include('name is required');
    });

    it('should fail validation for value below minimum', () => {
      const doc = {
        name: 'John Doe',
        age: 15,
        email: 'john@example.com'
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors).to.not.be.empty;
      expect(result.errors[0].message).to.include('age must be at least 18');
    });

    it('should fail validation for invalid email format', () => {
      const doc = {
        name: 'John Doe',
        age: 30,
        email: 'invalid-email'
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors).to.not.be.empty;
      expect(result.errors[0].message).to.include('email does not match pattern');
    });

    it('should validate array fields correctly', () => {
      const doc = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        tags: ['not', 'an', 'array']
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.true;
    });

    it('should fail validation for wrong type', () => {
      const doc = {
        name: 'John Doe',
        age: 'thirty', // Should be a number
        email: 'john@example.com'
      };

      const result = schema.validate(doc);
      expect(result.isValid).to.be.false;
      expect(result.errors).to.be.an('array');
      expect(result.errors).to.not.be.empty;
      expect(result.errors[0].message).to.include('age must be of type Number');
    });
  });

  describe('applyDefaults', () => {
    it('should apply default values to document', () => {
      const schema = new Schema({
        name: { type: String, default: 'Anonymous' },
        age: { type: Number, default: 25 },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: () => new Date('2023-01-01') }
      });

      const doc = {};
      const result = schema.applyDefaults(doc);

      expect(result.name).to.equal('Anonymous');
      expect(result.age).to.equal(25);
      expect(result.isActive).to.be.true;
      expect(result.createdAt).to.be.an.instanceof(Date);
      expect(result.createdAt.toISOString()).to.include('2023-01-01');
    });

    it('should not override existing values with defaults', () => {
      const schema = new Schema({
        name: { type: String, default: 'Anonymous' },
        age: { type: Number, default: 25 }
      });

      const doc = { name: 'John Doe', age: 30 };
      const result = schema.applyDefaults(doc);

      expect(result.name).to.equal('John Doe');
      expect(result.age).to.equal(30);
    });

    it('should handle function defaults', () => {
      const schema = new Schema({
        timestamp: { type: Date, default: Date.now },
        random: { type: Number, default: () => Math.random() }
      });

      const doc = {};
      const result = schema.applyDefaults(doc);

      expect(result.timestamp).to.be.an.instanceof(Date);
      expect(result.random).to.be.a('number');
    });
  });
});
