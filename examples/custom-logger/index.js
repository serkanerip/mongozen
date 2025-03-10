const MongoZen = require('../../src');

// Need to wrap in an async function since top-level await is not allowed in CommonJS
async function run() {
  // Create a custom logger
  const customLogger = {
    level: 'debug',
    error: (msg) => console.error(`[CUSTOM ERROR] ${msg}`),
    warn: (msg) => console.warn(`[CUSTOM WARN] ${msg}`),
    info: (msg) => console.info(`[CUSTOM INFO] ${msg}`),
    debug: (msg) => console.log(`[CUSTOM DEBUG] ${msg}`)
  };
  
  // Create MongoZen with custom logger
  const mongoZen = new MongoZen({ logger: customLogger, logLevel: 'debug' });
  
  // Get the logger instance if you want to use it directly
  const logger = mongoZen.getLogger();
  logger.debug('Starting custom logger example');
  
  // Define a schema
  const userSchema = new mongoZen.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true }
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
