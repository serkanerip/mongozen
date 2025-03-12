// Main entry point for the MongoZen ODM library

// Export the main MongoZen class as default export
import MongoZen from './mongozen.js';
export default MongoZen;

// Export individual components for direct usage
export { Connection } from './connection.js';
export { Schema } from './schema.js';
export { Model } from './model.js';

// Export types for TypeScript users
export * from './types.js';
