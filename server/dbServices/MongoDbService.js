import { getMongoClient } from "./mongoClient.js";

export class MongoDbService {
  constructor(dbName) {
    this.dbName = dbName;
  }

  // Helper to get a collection by name
  async getCollection(collectionName) {
    const client = await getMongoClient();
    return client.db(this.dbName).collection(collectionName);
  }

  async withSession(callback) {
    const client = await getMongoClient();
    const session = client.startSession();
    try {
      return await callback(client.db(this.dbName), session);
    } finally {
      await session.endSession();
    }
  }

  // Example: Transactional operation
  async doAtomicOperation() {
    return this.withSession(async (db, session) => {
      let result;
      await session.withTransaction(async () => {
        // Your transactional operations here
        // e.g., await db.collection('foo').insertOne({...}, { session });
        result = "success";
      });
      return result;
    });
  }

  // Example: Simple CRUD
  async findOne(collection, query) {
    const client = await getMongoClient();
    return client.db(this.dbName).collection(collection).findOne(query);
  }
}
