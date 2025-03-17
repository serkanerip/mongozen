// Main entry point for the MongoZen ODM library

export { MongoZen } from './mongozen.js';

// Export individual components for direct usage
export { Schema } from './schema.js';
export { Model } from './model.js';

// Export types for TypeScript users
export type {
  Logger,
  MongoZenOptions,
  SchemaDefinition,
  SchemaField,
  ConnectionOptions,
  ModelOptions,
  QueryOptions,
  UpdateOptions,
  AggregationOptions,
  IndexOptions,
} from './types.js';
