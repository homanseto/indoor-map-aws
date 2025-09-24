import express from "express";
import { MongoClient } from "mongodb";
import { Pool } from "pg";

const router = express.Router();

const mongoUrl = process.env.MONGO_URL;
const mongoDbName = process.env.MONGO_INITDB_DATABASE;
const mongoCollection = "testcollection";

const pgPool = new Pool({
  host: process.env.POSTGIS_HOST,
  port: process.env.POSTGIS_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

router.get("/test-db", async (req, res) => {
  let mongoResult, pgResult;
  try {
    const mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);
    mongoResult = await db.collection(mongoCollection).findOne({});
    await mongoClient.close();
  } catch (err) {
    mongoResult = { error: err.message };
  }

  try {
    const { rows } = await pgPool.query("SELECT * FROM test_table LIMIT 1;");
    pgResult = rows[0] || null;
  } catch (err) {
    pgResult = { error: err.message };
  }

  res.json({ mongo: mongoResult, postgis: pgResult });
});

// Optionally, keep the home page route if needed
// router.get("/", (req, res) => {
//   res.render("index", { title: "Express" });
// });

export default router;
