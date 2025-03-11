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
 * Schema class for defining document structure and validation rules
 */
class Schema {
  #options;
  #logger;
  
  /**
   * Create a new Schema instance
   * @param {Object} definition - Schema definition
   * @param {Object} options - Schema options
   */
  constructor(definition, options = {}) {
    if (!definition) {
      throw new Error('Schema definition is required');
    }
    if (typeof definition !== 'object') {
      throw new Error('Schema definition must be an object');
    }
    
    // Store instance options and definition
    this.#options = options;
    this.originalDefinition = definition; // Store the original definition
    this.definition = {};
    
    // Use the provided logger
    this.#logger = options.logger;
    
    // Process the definition
    this.definition = this.#processDefinition(definition);
    
    // Log schema creation if logger is available
    if (this.#logger) {
      this.#logger.debug('Schema created');
    }
  }
  
  /**
   * Process and validate the schema definition
   * @param {Object} def - Schema definition to process
   * @returns {Object} - Processed definition
   * @private
   */
  #processDefinition(def) {
    const processed = {};
    
    Object.keys(def).forEach(field => {
      let fieldDef = def[field];
      if (fieldDef === undefined || fieldDef === null) {
        throw new Error(`Definition cannot be undefined or null`);
      }
      
      // Handle array type definitions like [String]
      if (Array.isArray(fieldDef)) {
        processed[field] = {
          type: 'Array',
          required: false,
          default: undefined,
          validate: undefined,
          arrayType: fieldDef[0]?.name || 'Mixed'
        };
        return;
      }
      
      // Handle Object type
      if (fieldDef === Object) {
        processed[field] = {
          type: 'Mixed',
          required: false,
          default: undefined,
          validate: undefined
        };
        return;
      }
      
      // Create a standardized field definition object
      const fieldDefObj = Object.assign(
        {}, // Create a new object to avoid modifying the original
        {
          type: 'Mixed',
          required: false,
          default: undefined,
          validate: undefined
        },
        typeof fieldDef === 'object' && !Array.isArray(fieldDef) ? fieldDef : { type: fieldDef }
      );
      
      // Convert function type to string type name
      if (typeof fieldDefObj.type === 'function') {
        fieldDefObj.type = fieldDefObj.type.name;
      }
      
      // Validate the type
      if (!Object.keys(DefaultValidations).includes(fieldDefObj.type)) {
        throw new Error(`Invalid type: ${fieldDefObj.type}`);
      }
      
      // Validate the validation function
      if (fieldDefObj.validate && typeof fieldDefObj.validate !== 'function') {
        throw new Error(`Validation function must be a function`);
      }
      
      // Validate required property
      if (fieldDefObj.required !== undefined && typeof fieldDefObj.required !== 'boolean') {
        throw new Error(`Required property must be a boolean`);
      }
      
      // Store the processed field definition
      processed[field] = fieldDefObj;
    });
    
    return processed;
  }
  
  /**
   * Apply default values to a document based on schema
   * @param {Object} doc - Document to apply defaults to
   * @returns {Object} - Document with defaults applied
   */
  applyDefaults(doc = {}) {
    const result = { ...doc };
    
    Object.keys(this.definition).forEach(field => {
      const fieldDef = this.definition[field];
      
      // Skip if the field already has a value
      if (result[field] !== undefined) {
        return;
      }
      
      // Apply default value if specified
      if (fieldDef.default !== undefined) {
        if (typeof fieldDef.default === 'function') {
          const defaultValue = fieldDef.default();
          // Convert timestamp to Date if the field type is Date
          if (fieldDef.type === 'Date' && typeof defaultValue === 'number') {
            result[field] = new Date(defaultValue);
          } else {
            result[field] = defaultValue;
          }
        } else {
          result[field] = fieldDef.default;
        }
      }
    });
    
    return result;
  }
  
  /**
   * Validate a document against the schema
   * @param {Object} doc - Document to validate
   * @returns {Object} - Validation result with isValid and errors
   */
  validate(doc) {
    const errors = [];
    
    // Check each field in the schema
    Object.keys(this.definition).forEach(field => {
      const fieldDef = this.definition[field];
      const value = doc[field];
      
      // Check if required field is missing
      if (fieldDef.required && (value === undefined || value === null)) {
        errors.push({ field, message: `${field} is required` });
        return;
      }
      
      // Skip validation if value is undefined/null and not required
      if (value === undefined || value === null) {
        return;
      }
      
      // Type validation
      const typeDef = fieldDef.type;
      if (typeDef !== 'Mixed') {
        if (!DefaultValidations[typeDef](value)) {
          errors.push({ 
            field, 
            message: `${field} must be of type ${typeDef}` 
          });
          return; // Skip further validation if type is wrong
        }
      }
      
      // Min/max validation for numbers
      if (typeDef === 'Number') {
        if (fieldDef.min !== undefined && value < fieldDef.min) {
          errors.push({ 
            field, 
            message: `${field} must be at least ${fieldDef.min}` 
          });
        }
        
        if (fieldDef.max !== undefined && value > fieldDef.max) {
          errors.push({ 
            field, 
            message: `${field} must be at most ${fieldDef.max}` 
          });
        }
      }
      
      // Pattern validation for strings
      if (typeDef === 'String' && fieldDef.match instanceof RegExp) {
        if (!fieldDef.match.test(value)) {
          errors.push({ 
            field, 
            message: `${field} does not match pattern` 
          });
        }
      }
      
      // Array type validation
      if (typeDef === 'Array' && fieldDef.arrayType) {
        // Validate each item in the array
        for (let i = 0; i < value.length; i++) {
          const itemType = typeof fieldDef.arrayType === 'function' 
            ? fieldDef.arrayType.name 
            : fieldDef.arrayType;
            
          if (DefaultValidations[itemType] && !DefaultValidations[itemType](value[i])) {
            errors.push({ 
              field, 
              message: `Item at index ${i} in '${field}' must be of type ${itemType}` 
            });
          }
        }
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
  }
  
  /**
   * Get the logger instance
   * @returns {Object} - Logger instance
   */
  getLogger() {
    return this.#logger;
  }
  
  /**
   * Get the options
   * @returns {Object} - Options object
   */
  getOptions() {
    return this.#options;
  }
}

module.exports = Schema;
