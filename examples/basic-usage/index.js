const MongoZen = require('../../src');

// Create a MongoZen instance with default console logger
const mongoZen = new MongoZen({ logLevel: 'info' });

// You can change the log level at any time
// mongoZen.setLogLevel('debug'); // For more detailed logs
// mongoZen.setLogLevel('error'); // For only error logs

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
  }
});

// Create a User model
const User = new mongoZen.Model('users', userSchema);

// Example usage
async function runExample() {
  try {
    // Connect to MongoDB
    await mongoZen.connect('mongodb://mongo:pass@localhost:27017', 'test_db');
    console.log('Connected to MongoDB');
    
    // Create a user
    console.log('\nCreating a user...');
    const newUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      tags: ['customer', 'premium']
    });
    console.log('User created:', newUser);
    
    // Create multiple users
    console.log('\nCreating multiple users...');
    const users = await User.createMany([
      { name: 'Alice Smith', email: 'alice@example.com', age: 25 },
      { name: 'Bob Johnson', email: 'bob@example.com', age: 42 }
    ]);
    console.log(`Created ${users.length} users`);
    
    // Find all users
    console.log('\nFinding all users...');
    const allUsers = await User.find();
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}), age: ${user.age}`);
    });
    
    // Find users with query
    console.log('\nFinding users older than 25...');
    const olderUsers = await User.find({ age: { $gt: 25 } });
    console.log(`Found ${olderUsers.length} users older than 25`);
    
    // Update a user
    console.log('\nUpdating John\'s age...');
    await User.updateOne(
      { name: 'John Doe' },
      { age: 31 }
    );
    
    // Find John after update
    const john = await User.findOne({ name: 'John Doe' });
    console.log('John after update:', john);
    
    // Count users
    const count = await User.count();
    console.log(`\nTotal users in database: ${count}`);
    
    // Delete a user
    console.log('\nDeleting Bob...');
    const deleted = await User.deleteOne({ name: 'Bob Johnson' });
    console.log('Deleted Bob:', deleted);
    
    // Count again
    const newCount = await User.count();
    console.log(`Total users after deletion: ${newCount}`);
    
    // Aggregation example
    console.log('\nCalculating average age...');
    const avgAgeResult = await User.aggregate([
      { $group: { _id: null, averageAge: { $avg: '$age' } } }
    ]);
    console.log('Average age:', avgAgeResult[0]?.averageAge);
    
    // Clean up - delete all test users
    console.log('\nCleaning up - deleting all users...');
    const deletedCount = await User.deleteMany({});
    console.log(`Deleted ${deletedCount} users`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoZen.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the example
runExample().catch(err => console.error('Error in example:', err));
