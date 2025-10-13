import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URL;
let client;
let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    client = new MongoClient(uri, { useUnifiedTopology: true });
    clientPromise = client.connect();
  }
  return clientPromise;
}
