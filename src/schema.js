/**
 * Schema types for validation
 */

const DefaultValidations = {
  ObjectId: (val) => /^[0-9a-fA-F]{24}$/.test(val.toString()),
  Buffer: (val) => Buffer.isBuffer(val),
  Map: (val) => val instanceof Map,
  BigInt: (val) => typeof val === 'bigint',
  String: (val) => typeof val === 'string',
  Number: (val) => typeof val === 'number' && !isNaN(val),
  Boolean: (val) => typeof val === 'boolean',
  Date: (val) => val instanceof Date && !isNaN(val),
  Array: (val) => Array.isArray(val),
  Mixed: () => true
}

/**
 * Schema constructor function
 * @param {Object} definition - Schema definition object
 * @param {Object} options - Options for the schema
 * @returns {Object} - Schema instance
 */
function Schema(definition, options = {}) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Schema definition must be an object');
  }
  
  // Store instance options and definition
  this.options = options;
  this.definition = definition;
  
  // Use the provided logger
  this.logger = options.logger;

  function validateDefinition(def) {
    Object.keys(def).forEach(field => {
      const fieldDef = def[field];
      if (fieldDef === undefined || fieldDef === null) {
        throw new Error(`Definition cannot be undefined or null`);
      }
      
      const fieldDefObj = Object.assign(typeof fieldDef === 'object' ? fieldDef : { type: fieldDef }, {
        type: 'Mixed',
        required: false,
        default: undefined,
        validate: undefined
      });
      if (typeof fieldDefObj.type === 'function') {
        fieldDefObj.type = fieldDefObj.type.name;
      }
      if (!Object.keys(DefaultValidations).includes(fieldDefObj.type)) {
        throw new Error(`Invalid type: ${fieldDefObj.type}`);
      }
      if (fieldDefObj.validate && typeof fieldDefObj.validate !== 'function') {
        throw new Error(`Validation function must be a function`);
      }
      if (typeof fieldDefObj.required !== 'boolean') {
        throw new Error(`Required property must be a boolean`);
      }
      if (fieldDefObj.default !== undefined && fieldDefObj.default !== null) {
        if (typeof fieldDefObj.default !== fieldDefObj.type) {
          throw new Error(`Default value must be of type ${fieldDefObj.type}`);
        }
      }
      def[field] = fieldDefObj;
    });
  }

  validateDefinition(this.definition);
    
  /**
   * Apply default values to a document based on schema
   * @param {Object} doc - Document to apply defaults to
   * @returns {Object} - Document with defaults applied
   */
  this.applyDefaults = function(doc = {}) {
    const result = { ...doc };
    
    Object.keys(this.definition).forEach(field => {
      const fieldDef = this.definition[field];
      
      // Skip if the field already has a value
      if (result[field] !== undefined) {
        return;
      }
      
      // Apply default value if specified
      if (fieldDef.default !== undefined) {
        result[field] = typeof fieldDef.default === 'function' 
          ? fieldDef.default() 
          : fieldDef.default;
      }
    });
    
    return result;
  }
  
  // Log schema creation if logger is available
  if (this.logger) {
    this.logger.debug('Schema created');
  }
}

/**
 * Validate a document against the schema
 * @param {Object} doc - Document to validate
 * @returns {Object} - Validation result with isValid and errors
 */
Schema.prototype.validate = function(doc) {
  const errors = [];
  
  // Check each field in the schema
  Object.keys(this.definition).forEach(field => {
    const fieldDef = this.definition[field];
    const value = doc[field];
    
    // Check if required field is missing
    if (fieldDef.required && (value === undefined || value === null)) {
      errors.push({ field, message: `Field '${field}' is required` });
      return;
    }
    
    // Skip validation if value is undefined/null and not required
    if (value === undefined || value === null) {
      return;
    }
    
    // Get the type definition
    const typeDef = fieldDef.type
    if (typeDef === 'Mixed') {
      return;
    }
    console.log(typeDef)
    if (!DefaultValidations[typeDef](value)) {
      errors.push({ 
        field, 
        message: `Field '${field}' should be of type ${typeDef}, got ${typeof value}` 
      });
    }
    
    // Run custom validators if defined
    if (fieldDef.validate && typeof fieldDef.validate === 'function') {
      try {
        const isValid = fieldDef.validate(value);
        if (!isValid) {
          errors.push({ 
            field, 
            message: fieldDef.message || `Field '${field}' failed custom validation` 
          });
        }
      } catch (error) {
        errors.push({ field, message: error.message });
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = Schema;
