import { MongoClient } from "mongodb";

// Use environment variable or fallback to localhost
const mongoUrl = process.env.MONGO_URL;

let client;
let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    // 🔍 Debug logging
    console.log("🔗 MongoDB Connection Debug:");
    console.log("   NODE_ENV:", process.env.NODE_ENV);
    console.log("   DOCKER_ENV:", process.env.DOCKER_ENV);
    console.log("   HOSTNAME:", process.env.HOSTNAME);
    console.log("   MONGO_URL:", mongoUrl);

    client = new MongoClient(mongoUrl);
    clientPromise = client
      .connect()
      .then((connectedClient) => {
        console.log("✅ MongoDB connected successfully!");
        return connectedClient;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection failed:", error.message);
        throw error;
      });
  }
  return clientPromise;
}
