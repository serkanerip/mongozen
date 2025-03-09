const MongoZen = require('./src');

// Need to wrap in an async function since top-level await is not allowed in CommonJS
async function run() {
  // Create MongoZen instance with debug level for more verbose logging
  const mongoZen = new MongoZen({ logLevel: 'debug' });
  
  // Get the logger instance if you want to use it directly
  const logger = mongoZen.getLogger();
  logger.debug('Starting example2.js demonstration');
  
  // Example of how to use a custom logger (commented out)
  /*
  // You can use any logger library like Winston, Pino, Bunyan, etc.
  // Or create your own custom logger with the required methods
  const customLogger = {
    level: 'debug',
    error: (msg) => console.error(`[CUSTOM ERROR] ${msg}`),
    warn: (msg) => console.warn(`[CUSTOM WARN] ${msg}`),
    info: (msg) => console.info(`[CUSTOM INFO] ${msg}`),
    debug: (msg) => console.log(`[CUSTOM DEBUG] ${msg}`)
  };
  
  // Create MongoZen with custom logger
  const customMongoZen = new MongoZen({ logger: customLogger });
  */

  // Define a schema
  const userSchema = new mongoZen.Schema({
    name: { type: mongoZen.SchemaTypes.String, required: true },
    email: { type: mongoZen.SchemaTypes.String, required: true }
  });

  // Create a model
  const User = new mongoZen.Model('users', userSchema);

  try {
    // Connect to MongoDB
    await mongoZen.connect('mongodb://mongo:pass@localhost:27017', 'test_db');
    console.log('Connected to MongoDB');

    // Use the model
    const user = await User.create({ name: 'John', email: 'john@example.com' });
    console.log('User created:', user);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoZen.close();
    console.log('MongoDB connection closed');
  }
}

// Run the function
run();