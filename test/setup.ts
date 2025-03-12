import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let mongoUri: string;

// Start MongoDB instance
async function startMongo(): Promise<{ mongoClient: MongoClient; mongoUri: string }> {
  mongoServer = await MongoMemoryServer.create();
  mongoUri = mongoServer.getUri();
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  return { mongoClient, mongoUri };
}

// Stop MongoDB instance
async function stopMongo(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

export {
  startMongo,
  stopMongo,
}

export const getMongoUri = () => mongoUri;
export const getMongoClient = () => mongoClient;