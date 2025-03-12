import { Document } from 'mongodb';

// Logger interfaces
export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  level?: string;
}

// Connection options
export interface ConnectionOptions {
  poolSize?: number;
  useNewUrlParser?: boolean;
  useUnifiedTopology?: boolean;
  [key: string]: any;
}

// MongoZen options
export interface MongoZenOptions {
  logger?: Logger;
  logLevel?: string;
}

// Schema field definition
export interface SchemaField {
  type: any;
  required?: boolean;
  default?: any;
  validate?: (value: any) => boolean | Promise<boolean>;
}

// Schema definition
export interface SchemaDefinition {
  [key: string]: SchemaField | any;
}

// Model options
export interface ModelOptions {
  connection?: any;
  logger?: Logger;
  [key: string]: any;
}

// Query options
export interface QueryOptions {
  projection?: Document;
  sort?: Document;
  skip?: number;
  limit?: number;
  [key: string]: any;
}

// Update options
export interface UpdateOptions {
  upsert?: boolean;
  [key: string]: any;
}

// Aggregation options
export interface AggregationOptions {
  allowDiskUse?: boolean;
  [key: string]: any;
}

// Index options
export interface IndexOptions {
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  expireAfterSeconds?: number;
  [key: string]: any;
}
