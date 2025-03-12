import { Logger } from './types.js';
import { SchemaDefinition, SchemaField } from './types.js';

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

interface SchemaOptions {
  logger?: Logger;
  [key: string]: any;
}

/**
 * Default validation functions for different types
 */
const DefaultValidations: Record<string, (val: any) => boolean> = {
  ObjectId: (val: any) => /^[0-9a-fA-F]{24}$/.test(val.toString()),
  Buffer: (val: any) => Buffer.isBuffer(val),
  Map: (val: any) => val instanceof Map,
  BigInt: (val: any) => typeof val === 'bigint',
  String: (val: any) => typeof val === 'string',
  Number: (val: any) => typeof val === 'number' && !isNaN(val),
  Boolean: (val: any) => typeof val === 'boolean',
  Date: (val: any) => val instanceof Date && !isNaN(val.getTime()),
  Array: (val: any) => Array.isArray(val),
  Mixed: () => true
};

/**
 * Schema class for defining document structure and validation rules
 */
export class Schema {
  private options: SchemaOptions;
  private logger: Logger | undefined;
  public definition: SchemaDefinition;
  public originalDefinition: SchemaDefinition;

  /**
   * Create a new Schema instance
   * @param definition - Schema definition
   * @param options - Schema options
   */
  constructor(definition: SchemaDefinition, options: SchemaOptions = {}) {
    if (!definition) {
      throw new Error('Schema definition is required');
    }
    if (typeof definition !== 'object') {
      throw new Error('Schema definition must be an object');
    }
    
    // Store instance options and definition
    this.options = options;
    this.originalDefinition = definition; // Store the original definition
    this.definition = {};
    
    // Use the provided logger
    this.logger = options.logger;
    
    // Process the definition
    this.definition = this.processDefinition(definition);
    
    // Log schema creation if logger is available
    if (this.logger) {
      this.logger.debug('Schema created');
    }
  }
  
  /**
   * Process and validate the schema definition
   * @param def - Schema definition to process
   * @returns Processed definition
   * @private
   */
  private processDefinition(def: SchemaDefinition): SchemaDefinition {
    const processed: SchemaDefinition = {};
    
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
      ) as SchemaField;
      
      // Convert function type to string type name
      if (typeof fieldDefObj.type === 'function') {
        fieldDefObj.type = fieldDefObj.type.name;
      }
      
      // Validate the type
      if (!Object.keys(DefaultValidations).includes(fieldDefObj.type as string)) {
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
   * @param doc - Document to apply defaults to
   * @returns Document with defaults applied
   */
  applyDefaults(doc: Record<string, any> = {}): Record<string, any> {
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
   * @param doc - Document to validate
   * @returns Validation result with isValid and errors
   */
  validate(doc: Record<string, any>): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    
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
      const typeDef = fieldDef.type as string;
      if (typeDef !== 'Mixed') {
        if (!DefaultValidations[typeDef](value)) {
          errors.push({ 
            field, 
            message: `${field} must be of type ${typeDef}` 
          });
          return; // Skip further validation if type is wrong
        }
      }
      
      // Run custom validators if defined
      if (fieldDef.validate && typeof fieldDef.validate === 'function') {
        try {
          const isValid = fieldDef.validate(value);
          if (!isValid) {
            errors.push({ 
              field, 
              message: (fieldDef as any).message || `Field '${field}' failed custom validation` 
            });
          }
        } catch (error) {
          errors.push({ field, message: (error as Error).message });
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
   * @returns Logger instance
   */
  getLogger(): Logger | undefined {
    return this.logger;
  }
  
  /**
   * Get the options
   * @returns Options object
   */
  getOptions(): SchemaOptions {
    return this.options;
  }
}
