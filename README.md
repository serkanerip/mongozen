# MongoZen

A simple MongoDB Object Document Mapper (ODM) built with the official MongoDB Node.js driver. This lightweight ODM provides schema validation and helpful functions for working with MongoDB collections without using TypeScript or classes. MongoZen includes a flexible logging system with configurable log levels and support for custom loggers.

## Features

- Connection management
- Schema definition and validation
- Default value handling
- CRUD operations
- Query helpers
- Aggregation support
- Index creation
- Flexible logging system with configurable log levels and custom logger support

## Installation

```bash
npm install mongozen
```

## Usage

### Creating a MongoZen Instance

```javascript
const MongoZen = require('mongozen');

// Create a MongoZen instance with default log level (info)
const mongoZen = new MongoZen();

// Or create with a specific log level
const mongoZenDebug = new MongoZen({ logLevel: 'debug' });

// Or create with a custom logger (any logger with error, warn, info, debug methods)
const customLogger = {
  level: 'debug',
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`)
};

const mongoZenCustom = new MongoZen({ logger: customLogger });

// You can also use popular logging libraries like Winston, Pino, Bunyan, etc.
// Just make sure they implement the required methods (error, warn, info, debug)
```

### Connecting to MongoDB

```javascript
// Connect to MongoDB
async function connectToDb() {
  try {
    await mongoZen.connect('mongodb://localhost:27017', 'mydatabase');
    console.log('Connected to MongoDB!');
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}

// Close connection when done
async function closeConnection() {
  await mongoZen.close();
}
```

### Defining a Schema

```javascript
// Define a user schema
const userSchema = new mongoZen.Schema({
  name: {
    type: mongoZen.SchemaTypes.String,
    required: true
  },
  email: {
    type: mongoZen.SchemaTypes.String,
    required: true,
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Invalid email format'
  },
  age: {
    type: mongoZen.SchemaTypes.Number,
    default: 18
  },
  isActive: {
    type: mongoZen.SchemaTypes.Boolean,
    default: true
  },
  createdAt: {
    type: mongoZen.SchemaTypes.Date,
    default: () => new Date()
  },
  tags: {
    type: mongoZen.SchemaTypes.Array,
    default: []
  },
  metadata: {
    type: mongoZen.SchemaTypes.Object,
    default: {}
  }
});
```

### Creating a Model

```javascript
// Create a User model
const User = new mongoZen.Model('users', userSchema);
```

### CRUD Operations

```javascript
// Create a new user
async function createUser() {
  try {
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30
    });
    console.log('User created:', newUser);
    return newUser;
  } catch (error) {
    console.error('Failed to create user:', error);
  }
}

// Find users
async function findUsers() {
  // Find all users
  const allUsers = await User.find();
  
  // Find with query
  const activeUsers = await User.find({ isActive: true });
  
  // Find with options
  const recentUsers = await User.find(
    { age: { $gt: 25 } },
    { sort: { createdAt: -1 }, limit: 10 }
  );
  
  // Find by ID
  const user = await User.findById('60d21b4667d0d8992e610c85');
  
  // Find one
  const adminUser = await User.findOne({ role: 'admin' });
}

// Update users
async function updateUsers() {
  // Update by ID
  const updateResult = await User.updateById(
    '60d21b4667d0d8992e610c85',
    { $set: { isActive: false } }
  );
  
  // Update one
  await User.updateOne(
    { email: 'john@example.com' },
    { name: 'John Smith' }
  );
  
  // Update many
  await User.updateMany(
    { age: { $lt: 18 } },
    { isActive: false }
  );
}

// Delete users
async function deleteUsers() {
  // Delete by ID
  await User.deleteById('60d21b4667d0d8992e610c85');
  
  // Delete one
  await User.deleteOne({ email: 'john@example.com' });
  
  // Delete many
  const deletedCount = await User.deleteMany({ isActive: false });
  console.log(`Deleted ${deletedCount} inactive users`);
}

// Aggregation
async function aggregateUsers() {
  const results = await User.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, averageAge: { $avg: '$age' } } }
  ]);
  console.log('Average age of active users:', results[0]?.averageAge);
}
```

## API Reference

### MongoZen Constructor

- `new MongoZen(options)` - Create a new MongoZen instance with optional configuration
  - `options.logLevel` - Log level (debug, info, warn, error)
  - `options.logger` - Custom logger object with error, warn, info, and debug methods

### Instance Methods

#### Connection

- `mongoZen.connect(uri, dbName, options)` - Connect to MongoDB
- `mongoZen.getDb()` - Get the database instance
- `mongoZen.close()` - Close the connection

#### Logging

- `mongoZen.setLogLevel(level)` - Change the log level (debug, info, warn, error)
- `mongoZen.getLogger()` - Get the Winston logger instance

#### Schema

- `mongoZen.createSchema(definition)` - Create a schema
- `mongoZen.SchemaTypes` - Available schema types
  - `String`, `Number`, `Boolean`, `Date`, `ObjectId`, `Array`, `Object`, `Mixed`

#### Model

- `mongoZen.createModel(collectionName, schema)` - Create a model

#### Model Methods

- `find(query, options)` - Find documents
- `findById(id)` - Find a document by ID
- `findOne(query, options)` - Find a single document
- `count(query)` - Count documents
- `create(doc)` - Create a document
- `createMany(docs)` - Create multiple documents
- `updateById(id, update, options)` - Update a document by ID
- `updateOne(filter, update, options)` - Update a single document
- `updateMany(filter, update, options)` - Update multiple documents
- `deleteById(id)` - Delete a document by ID
- `deleteOne(filter)` - Delete a single document
- `deleteMany(filter)` - Delete multiple documents
- `aggregate(pipeline, options)` - Perform aggregation
- `createIndex(keys, options)` - Create an index
- `getCollection()` - Get the MongoDB collection instance

## License

MIT
