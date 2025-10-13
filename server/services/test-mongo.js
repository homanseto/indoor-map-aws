import { MongoClient } from "mongodb";
const uri =
  "mongodb://admin:adminpassword@localhost:27018/indoor_map?authSource=admin&replicaSet=rs0";
MongoClient.connect(uri, { useUnifiedTopology: true })
  .then((client) => {
    console.log("Connected!");
    client.close();
  })
  .catch((err) => {
    console.error("Connection error:", err);
  });
