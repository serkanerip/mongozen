/**
 * Schema types for validation
 */
const SchemaTypes = {
  String: { type: 'string', validate: (val) => typeof val === 'string' },
  Number: { type: 'number', validate: (val) => typeof val === 'number' && !isNaN(val) },
  Boolean: { type: 'boolean', validate: (val) => typeof val === 'boolean' },
  Date: { type: 'date', validate: (val) => val instanceof Date && !isNaN(val) },
  ObjectId: { type: 'objectId', validate: (val) => /^[0-9a-fA-F]{24}$/.test(val.toString()) },
  Array: { type: 'array', validate: (val) => Array.isArray(val) },
  Object: { type: 'object', validate: (val) => typeof val === 'object' && val !== null && !Array.isArray(val) },
  Mixed: { type: 'mixed', validate: () => true } // Mixed type accepts any value
};

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
  
  // Instance reference to SchemaTypes
  this.SchemaTypes = SchemaTypes;
  /**
   * Validate a document against the schema
   * @param {Object} doc - Document to validate
   * @returns {Object} - Validation result with isValid and errors
   */
    
    /**
     * Validate a document against the schema
     * @param {Object} doc - Document to validate
     * @returns {Object} - Validation result with isValid and errors
     */
  this.validate = function(doc) {
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
      const typeDef = fieldDef.type || fieldDef;
      const schemaType = typeof typeDef === 'function' ? typeDef : typeDef.validate;
      
      // Validate the field value
      if (schemaType && !schemaType(value)) {
        const typeStr = typeof typeDef === 'function' ? typeDef.name : typeDef.type;
        errors.push({ 
          field, 
          message: `Field '${field}' should be of type ${typeStr}, got ${typeof value}` 
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

// Set SchemaTypes as a static property of the Schema constructor
Schema.SchemaTypes = SchemaTypes;

// Export the Schema constructor with SchemaTypes
module.exports = Schema;
