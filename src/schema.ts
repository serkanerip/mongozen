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

      // handle sub object type definitions
      if (typeof fieldDef === 'object' && !Array.isArray(fieldDef) && !Object.hasOwn(fieldDef, 'type')) {
        processed[field] = this.processDefinition(fieldDef);
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
      
      // Handle nested objects/sub-schemas
      if (typeof fieldDef === 'object' && !Array.isArray(fieldDef) && !fieldDef.type) {
        // Create empty object for the nested field
        result[field] = {};
        
        // Recursively apply defaults to nested fields
        Object.keys(fieldDef).forEach(nestedField => {
          const nestedFieldDef = fieldDef[nestedField];
          
          // Apply default if specified for nested field
          if (nestedFieldDef.default !== undefined) {
            if (typeof nestedFieldDef.default === 'function') {
              const defaultValue = nestedFieldDef.default();
              // Convert timestamp to Date if the field type is Date
              if (nestedFieldDef.type === 'Date' && typeof defaultValue === 'number') {
                result[field][nestedField] = new Date(defaultValue);
              } else {
                result[field][nestedField] = defaultValue;
              }
            } else {
              result[field][nestedField] = nestedFieldDef.default;
            }
          }
        });
        
        // If the nested object is empty (no defaults applied), remove it
        if (Object.keys(result[field]).length === 0) {
          delete result[field];
        }
        
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
    
    // Helper function to validate a field against its definition
    const validateField = (field: string, fieldDef: any, value: any, parentPath = '') => {
      const fullPath = parentPath ? `${parentPath}.${field}` : field;
      
      // Handle nested objects/sub-schemas
      if (typeof fieldDef === 'object' && !Array.isArray(fieldDef) && !fieldDef.type) {
        // Skip validation if value is undefined/null
        if (value === undefined || value === null) {
          // Check if any nested fields are required
          Object.keys(fieldDef).forEach(nestedField => {
            if (fieldDef[nestedField].required) {
              errors.push({ field: `${fullPath}.${nestedField}`, message: `${fullPath}.${nestedField} is required` });
            }
          });
          return;
        }
        
        // Validate that value is an object
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ field: fullPath, message: `${fullPath} must be an object` });
          return;
        }
        
        // Validate each nested field
        Object.keys(fieldDef).forEach(nestedField => {
          validateField(nestedField, fieldDef[nestedField], value[nestedField], fullPath);
        });
        
        return;
      }
      
      // Check if required field is missing
      if (fieldDef.required && (value === undefined || value === null)) {
        errors.push({ field: fullPath, message: `${fullPath} is required` });
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
            field: fullPath, 
            message: `${fullPath} must be of type ${typeDef}` 
          });
          return; // Skip further validation if type is wrong
        }
      }
      
      // Validate enum (for any type)
      if (fieldDef.enum && !fieldDef.enum.includes(value)) {
        errors.push({ 
          field: fullPath, 
          message: `${fullPath} must be one of: ${fieldDef.enum.join(', ')}` 
        });
      }
      
      // Validate string constraints
      if (typeDef === 'String') {
        // Validate minLength
        if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
          errors.push({ 
            field: fullPath, 
            message: `${fullPath} must be at least ${fieldDef.minLength} characters long` 
          });
        }
        
        // Validate maxLength
        if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
          errors.push({ 
            field: fullPath, 
            message: `${fullPath} must be at most ${fieldDef.maxLength} characters long` 
          });
        }
        
        // Validate pattern
        if (fieldDef.pattern && !fieldDef.pattern.test(value)) {
          errors.push({ 
            field: fullPath, 
            message: `${fullPath} must match the pattern ${fieldDef.pattern}` 
          });
        }
      }
      
      // Validate number constraints
      if (typeDef === 'Number') {
        // Validate min
        if (fieldDef.min !== undefined && value < fieldDef.min) {
          errors.push({ 
            field: fullPath, 
            message: `${fullPath} must be at least ${fieldDef.min}` 
          });
        }
        
        // Validate max
        if (fieldDef.max !== undefined && value > fieldDef.max) {
          errors.push({ 
            field: fullPath, 
            message: `${fullPath} must be at most ${fieldDef.max}` 
          });
        }
      }
      
      // Validate array items
      if (typeDef === 'Array' && Array.isArray(value)) {
        // Handle array with type definition in brackets [{ type: String }]
        if (Array.isArray(fieldDef.type) && fieldDef.type.length > 0) {
          const itemDef = fieldDef.type[0];
          
          // Validate each item in the array
          value.forEach((item, index) => {
            const itemType = itemDef.type as string;
            
            // Type validation
            if (!DefaultValidations[itemType](item)) {
              errors.push({ 
                field: `${fullPath}[${index}]`, 
                message: `${fullPath}[${index}] must be of type ${itemType}` 
              });
              return;
            }
            
            // String validation for array items
            if (itemType === 'String') {
              // Validate minLength
              if (itemDef.minLength !== undefined && item.length < itemDef.minLength) {
                errors.push({ 
                  field: `${fullPath}[${index}]`, 
                  message: `${fullPath}[${index}] must be at least ${itemDef.minLength} characters long` 
                });
              }
              
              // Validate maxLength
              if (itemDef.maxLength !== undefined && item.length > itemDef.maxLength) {
                errors.push({ 
                  field: `${fullPath}[${index}]`, 
                  message: `${fullPath}[${index}] must be at most ${itemDef.maxLength} characters long` 
                });
              }
            }
            
            // Number validation for array items
            if (itemType === 'Number') {
              // Validate min
              if (itemDef.min !== undefined && item < itemDef.min) {
                errors.push({ 
                  field: `${fullPath}[${index}]`, 
                  message: `${fullPath}[${index}] must be at least ${itemDef.min}` 
                });
              }
              
              // Validate max
              if (itemDef.max !== undefined && item > itemDef.max) {
                errors.push({ 
                  field: `${fullPath}[${index}]`, 
                  message: `${fullPath}[${index}] must be at most ${itemDef.max}` 
                });
              }
            }
          });
        }
      }
      
      // Run custom validators if defined
      if (fieldDef.validate && typeof fieldDef.validate === 'function') {
        try {
          const isValid = fieldDef.validate(value);
          if (!isValid) {
            errors.push({ 
              field: fullPath, 
              message: (fieldDef as any).message || `Field '${fullPath}' failed custom validation` 
            });
          }
        } catch (error) {
          errors.push({ field: fullPath, message: (error as Error).message });
        }
      }
    };
    
    // Validate each field in the schema
    Object.keys(this.definition).forEach(field => {
      validateField(field, this.definition[field], doc[field]);
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
