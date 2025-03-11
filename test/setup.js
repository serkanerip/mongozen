const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const MongoZen = require('../src');

let mongoServer;
let mongoClient;
let mongoUri;

// Start MongoDB instance
async function startMongo() {
  const orginalCreateModel = MongoZen.prototype.createModel;
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  return { mongoClient, mongoUri };
}

// Stop MongoDB instance
async function stopMongo() {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

// Clear all collections in the database
async function clearDatabase() {
  if (!mongoClient) return;
  console.log('clearing db');
  
  const db = mongoClient.db();
  
  // Delete all documents from each known collection
  for (const collectionName of collectionNames) {
    try {
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`Cleared collection ${collectionName}: ${result.deletedCount} documents deleted`);
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error.message);
    }
  }
}

module.exports = {
  startMongo,
  stopMongo,
  clearDatabase,
  getMongoUri: () => mongoUri,
  getMongoClient: () => mongoClient,
};
