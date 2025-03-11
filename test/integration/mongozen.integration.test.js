const { expect } = require('chai');
const MongoZen = require('../../src/index');
const { startMongo, stopMongo, clearDatabase, getMongoUri } = require('../setup');

describe('MongoZen Integration Tests', () => {
  let mongoZen;
  let userModel;
  let postModel;
  
  before(async () => {
    // Start MongoDB server and get URI
    await startMongo();
    const mongoUri = getMongoUri();
    
    // Initialize MongoZen
    mongoZen = new MongoZen({ logLevel: 'debug' });
    
    // Connect to database
    await mongoZen.connect(mongoUri, 'test_db');
    
    // Store the connection for test reference
    connection = mongoZen.connection;
    
    // Create schemas
    const userSchema = mongoZen.createSchema({
      username: { type: String, required: true },
      email: { type: String, required: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      age: { type: Number, min: 18, max: 100 },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    });
    
    const postSchema = mongoZen.createSchema({
      title: { type: String, required: true },
      content: { type: String, required: true },
      authorId: { type: String, required: true },
      tags: [String],
      viewCount: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    });
    
    // Create models
    userModel = mongoZen.createModel('users', userSchema);
    postModel = mongoZen.createModel('posts', postSchema);
  });

  beforeEach(async () => {
    // Clear database before each test
    await Promise.all([userModel.deleteMany({}), postModel.deleteMany({})]);
  });
  
  after(async () => {
    // Close connection and stop MongoDB server
    await mongoZen.close();
    await stopMongo();
  });
  
  describe('CRUD Operations', () => {
    describe('Create', () => {
      it('should create a single document', async () => {
        const userData = {
          username: 'johndoe',
          email: 'john@example.com',
          age: 30
        };
        
        const user = await userModel.create(userData);
        
        expect(user).to.include(userData);
        expect(user._id).to.exist;
        expect(user.isActive).to.be.true; // Default value
        expect(user.createdAt).to.be.an.instanceof(Date);
      });
      
      it('should create multiple documents', async () => {
        const usersData = [
          { username: 'user1', email: 'user1@example.com', age: 25 },
          { username: 'user2', email: 'user2@example.com', age: 35 }
        ];
        
        const users = await userModel.createMany(usersData);
        
        expect(users).to.be.an('array').with.lengthOf(2);
        expect(users[0].username).to.equal('user1');
        expect(users[1].username).to.equal('user2');
        expect(users[0]._id).to.exist;
        expect(users[1]._id).to.exist;
      });
      
      it('should fail validation for invalid document', async () => {
        const invalidUser = {
          username: 'johndoe',
          email: 'invalid-email', // Invalid email format
          age: 15 // Below minimum age
        };
        
        try {
          await userModel.create(invalidUser);
          expect.fail('Should have thrown validation error');
        } catch (error) {
          expect(error.message).to.include('Validation failed');
          expect(error.message).to.include('email does not match pattern');
          expect(error.message).to.include('age must be at least 18');
        }
      });
    });
    
    describe('Read', () => {
      let testUsers;
      
      beforeEach(async () => {
        // Create test users
        testUsers = await userModel.createMany([
          { username: 'user1', email: 'user1@example.com', age: 25 },
          { username: 'user2', email: 'user2@example.com', age: 35 },
          { username: 'user3', email: 'user3@example.com', age: 45 }
        ]);
      });
      
      it('should find all documents', async () => {
        // Count before our test to ensure we're starting with a clean state
        const initialCount = await userModel.count();
        expect(initialCount).to.equal(3, 'Expected to start with exactly 3 test users');
        
        const users = await userModel.find();
        
        expect(users).to.be.an('array').with.lengthOf(3);
        expect(users.map(u => u.username).sort()).to.deep.equal(['user1', 'user2', 'user3'].sort());
      });
      
      it('should find documents with query', async () => {
        // Verify we have the expected test data
        const allUsers = await userModel.find();
        expect(allUsers.length).to.equal(3, 'Expected exactly 3 test users');
        
        const users = await userModel.find({ age: { $gt: 30 } });
        
        expect(users).to.be.an('array');
        expect(users.length).to.be.at.least(1, 'Expected at least one user with age > 30');
        
        // Verify the users match our query
        users.forEach(user => {
          expect(user.age).to.be.greaterThan(30);
        });
        
        // Find users with age > 30 and check if they include user2 and user3
        const usernames = users.map(u => u.username);
        expect(usernames).to.include.oneOf(['user2', 'user3']);
      });
      
      it('should find documents with projection, sort, skip, limit', async () => {
        // Verify we have the expected test data
        const allUsers = await userModel.find();
        expect(allUsers.length).to.equal(3, 'Expected exactly 3 test users');
        
        const users = await userModel.find(
          {},
          {
            projection: { username: 1, age: 1, _id: 0 },
            sort: { age: -1 },
            skip: 1,
            limit: 1
          }
        );
        
        expect(users).to.be.an('array').with.lengthOf(1, 'Expected exactly 1 result with skip and limit');
        expect(users[0]._id).to.not.exist;
        expect(users[0].email).to.not.exist;
        expect(users[0]).to.have.property('username');
        expect(users[0]).to.have.property('age');
        
        // Verify sorting worked - should be the middle age value when sorted descending
        const sortedAges = allUsers.map(u => u.age).sort((a, b) => b - a);
        expect(users[0].age).to.equal(sortedAges[1]);
      });
      
      it('should find document by ID', async () => {
        const user = await userModel.findById(testUsers[0]._id);
        
        expect(user).to.exist;
        expect(user.username).to.equal('user1');
      });
      
      it('should find one document by query', async () => {
        const user = await userModel.findOne({ username: 'user2' });
        
        expect(user).to.exist;
        expect(user.username).to.equal('user2');
        expect(user.age).to.equal(35);
      });
      
      it('should count documents', async () => {
        // First verify we have the expected test data
        const allUsers = await userModel.find();
        expect(allUsers.length).to.equal(3, 'Expected exactly 3 test users');
        
        // Count users with age > 30
        const count = await userModel.count({ age: { $gt: 30 } });
        
        // Verify count matches what we expect from the data
        const expectedCount = allUsers.filter(user => user.age > 30).length;
        expect(count).to.equal(expectedCount);
      });
    });
    
    describe('Update', () => {
      let testUser;
      
      beforeEach(async () => {
        // Create test user
        testUser = await userModel.create({
          username: 'johndoe',
          email: 'john@example.com',
          age: 30
        });
      });
      
      it('should update document by ID', async () => {
        const result = await userModel.updateById(
          testUser._id,
          { username: 'janedoe', age: 32 }
        );
        
        expect(result.acknowledged).to.be.true;
        expect(result.matchedCount).to.equal(1);
        expect(result.modifiedCount).to.equal(1);
        
        // Verify update
        const updatedUser = await userModel.findById(testUser._id);
        expect(updatedUser.username).to.equal('janedoe');
        expect(updatedUser.age).to.equal(32);
        expect(updatedUser.email).to.equal('john@example.com'); // Unchanged
      });
      
      it('should update document with operators', async () => {
        const result = await userModel.updateById(
          testUser._id,
          { $inc: { age: 5 }, $set: { isActive: false } }
        );
        
        expect(result.modifiedCount).to.equal(1);
        
        // Verify update
        const updatedUser = await userModel.findById(testUser._id);
        expect(updatedUser.age).to.equal(35); // Incremented by 5
        expect(updatedUser.isActive).to.be.false;
      });
      
      it('should update one document by query', async () => {
        // Create additional users
        await userModel.createMany([
          { username: 'user1', email: 'user1@example.com', age: 25 },
          { username: 'user2', email: 'user2@example.com', age: 35 }
        ]);
        
        const result = await userModel.updateOne(
          { age: { $lt: 30 } },
          { isActive: false }
        );
        
        expect(result.matchedCount).to.equal(1);
        expect(result.modifiedCount).to.equal(1);
        
        // Verify only one document was updated
        const inactiveUsers = await userModel.find({ isActive: false });
        expect(inactiveUsers).to.have.lengthOf(1);
        expect(inactiveUsers[0].username).to.equal('user1');
      });
      
      it('should update many documents by query', async () => {
        // Clear any existing data first to ensure a clean state
        await userModel.deleteMany({});
        
        // Create test users with specific ages
        await userModel.createMany([
          { username: 'user1', email: 'user1@example.com', age: 25 },
          { username: 'user2', email: 'user2@example.com', age: 35 },
          { username: 'user3', email: 'user3@example.com', age: 45 }
        ]);
        
        // Verify we have the expected test data
        const initialUsers = await userModel.find();
        expect(initialUsers.length).to.equal(3, 'Expected exactly 3 test users');
        
        // Count users with age >= 30 before update
        const usersToUpdate = initialUsers.filter(user => user.age >= 30);
        expect(usersToUpdate.length).to.be.at.least(1, 'Expected at least one user with age >= 30');
        
        const result = await userModel.updateMany(
          { age: { $gte: 30 } },
          { isActive: false }
        );
        
        expect(result.matchedCount).to.equal(usersToUpdate.length);
        expect(result.modifiedCount).to.equal(usersToUpdate.length);
        
        // Verify correct number of documents were updated
        const inactiveUsers = await userModel.find({ isActive: false });
        expect(inactiveUsers.length).to.equal(usersToUpdate.length);
      });
    });
    
    describe('Delete', () => {
      let testUsers;
      
      beforeEach(async () => {
        // Create test users
        testUsers = await userModel.createMany([
          { username: 'user1', email: 'user1@example.com', age: 25 },
          { username: 'user2', email: 'user2@example.com', age: 35 },
          { username: 'user3', email: 'user3@example.com', age: 45 }
        ]);
      });
      
      it('should delete document by ID', async () => {
        const result = await userModel.deleteById(testUsers[0]._id);
        
        expect(result).to.be.true;
        
        // Verify deletion
        const user = await userModel.findById(testUsers[0]._id);
        expect(user).to.be.null;
        
        // Verify other documents still exist
        const count = await userModel.count();
        expect(count).to.equal(2);
      });
      
      it('should delete one document by query', async () => {
        const result = await userModel.deleteOne({ age: { $lt: 30 } });
        
        expect(result).to.be.true;
        
        // Verify only one document was deleted
        const count = await userModel.count();
        expect(count).to.equal(2);
      });
      
      it('should delete many documents by query', async () => {
        const result = await userModel.deleteMany({ age: { $gte: 30 } });
        
        expect(result).to.equal(2);
        
        // Verify multiple documents were deleted
        const count = await userModel.count();
        expect(count).to.equal(1);
        
        const remainingUser = await userModel.findOne();
        expect(remainingUser.username).to.equal('user1');
      });
    });
  });
  
  describe('Relationships', () => {
    let author;
    
    beforeEach(async () => {
      // Create author
      author = await userModel.create({
        username: 'author',
        email: 'author@example.com',
        age: 30
      });
      
      // Create posts for author
      await postModel.createMany([
        {
          title: 'First Post',
          content: 'Content of first post',
          authorId: author._id.toString(),
          tags: ['mongodb', 'nodejs']
        },
        {
          title: 'Second Post',
          content: 'Content of second post',
          authorId: author._id.toString(),
          tags: ['javascript']
        }
      ]);
    });
    
    it('should find posts by author ID', async () => {
      const posts = await postModel.find({ authorId: author._id.toString() });
      
      expect(posts).to.be.an('array').with.lengthOf(2);
      expect(posts[0].title).to.equal('First Post');
      expect(posts[1].title).to.equal('Second Post');
    });
    
    it('should find posts by tag', async () => {
      const posts = await postModel.find({ tags: 'mongodb' });
      
      expect(posts).to.be.an('array').with.lengthOf(1);
      expect(posts[0].title).to.equal('First Post');
    });
  });
  
  describe('Aggregation', () => {
    beforeEach(async () => {
      // Create users
      const users = await userModel.createMany([
        { username: 'user1', email: 'user1@example.com', age: 25 },
        { username: 'user2', email: 'user2@example.com', age: 35 },
        { username: 'user3', email: 'user3@example.com', age: 45 },
        { username: 'user4', email: 'user4@example.com', age: 25 }
      ]);
      
      // Create posts
      await postModel.createMany([
        {
          title: 'Post 1',
          content: 'Content 1',
          authorId: users[0]._id.toString(),
          viewCount: 10,
          tags: ['tag1', 'tag2']
        },
        {
          title: 'Post 2',
          content: 'Content 2',
          authorId: users[0]._id.toString(),
          viewCount: 20,
          tags: ['tag2', 'tag3']
        },
        {
          title: 'Post 3',
          content: 'Content 3',
          authorId: users[1]._id.toString(),
          viewCount: 30,
          tags: ['tag1', 'tag3']
        }
      ]);
    });
    
    it('should perform aggregation', async () => {
      const results = await postModel.aggregate([
        { $group: { _id: '$authorId', totalViews: { $sum: '$viewCount' }, postCount: { $sum: 1 } } },
        { $sort: { totalViews: -1 } }
      ]);
      
      expect(results).to.be.an('array').with.lengthOf(2);
      
      // Find the result with postCount = 2 (user1)
      const user1Result = results.find(r => r.postCount === 2);
      expect(user1Result).to.exist;
      expect(user1Result.totalViews).to.equal(30);
      
      // Find the result with postCount = 1 (user2)
      const user2Result = results.find(r => r.postCount === 1);
      expect(user2Result).to.exist;
      expect(user2Result.totalViews).to.equal(30);
    });
    
    it('should perform aggregation with match', async () => {
      const results = await postModel.aggregate([
        { $match: { tags: 'tag1' } },
        { $group: { _id: '$authorId', count: { $sum: 1 } } }
      ]);
      
      expect(results).to.be.an('array').with.lengthOf(2);
    });
  });
  
  describe('Indexing', () => {
    it('should create an index', async () => {
      const indexName = await userModel.createIndex(
        { username: 1, email: 1 },
        { unique: true }
      );
      
      expect(indexName).to.be.a('string');
      
      // Test uniqueness constraint
      await userModel.create({
        username: 'unique1',
        email: 'unique1@example.com',
        age: 30
      });
      
      try {
        // Try to create another user with the same username and email
        await userModel.create({
          username: 'unique1',
          email: 'unique1@example.com',
          age: 35
        });
        expect.fail('Should have thrown duplicate key error');
      } catch (error) {
        expect(error.message).to.include('duplicate key error');
      }
    });
  });
});
