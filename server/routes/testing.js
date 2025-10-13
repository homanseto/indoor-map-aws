import express from "express";
import path from "path";
import { MongoDbService } from "../dbServices/MongoDbService.js";
import { PostgisService } from "../dbServices/PostgisService.js";
import { JsonFileService } from "../services/JsonFileService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { POSTGIS_TABLE } from "../../config/postgistable.js";
import { Utils } from "../services/utils.js";

const router = express.Router();

const mongoDbName = process.env.MONGO_INITDB_DATABASE;
const mongoDbService = new MongoDbService(mongoDbName);
const postgisService = new PostgisService();
const utils = new Utils();

router.get("/test-db", async (req, res) => {
  let mongoResult, pgResult;
  try {
    mongoResult = await mongoDbService.findOne(
      MONGO_COLLECTIONS.TEST_COLLECTION,
      {}
    );
  } catch (err) {
    mongoResult = { error: err.message };
  }

  try {
    const sql = `SELECT * FROM ${POSTGIS_TABLE.TEST_TABLE}`;
    const params = [];
    pgResult = await postgisService.query(sql, params);
    if (pgResult.rows.length > 0) {
      pgResult = pgResult.rows[0];
    } else {
      pgResult = null;
    }
  } catch (err) {
    pgResult = { error: err.message };
  }

  res.json({ mongo: mongoResult, postgis: pgResult });
});

// GET /test-read-json?file=filename.json
router.get("/test-read-json", async (req, res) => {
  const fileName = req.query.fileName;
  const testDir = "./testing-data";
  try {
    const filePath = path.join(testDir, fileName);
    if (!filePath) {
      return res.status(400).json({ error: "Missing 'file' query parameter" });
    }
    const jsonService = new JsonFileService();
    const json = await jsonService.readJson(filePath);
    const venues = await utils.convertToVenueMongoDBTable(json.data);
    console.log("Read JSON from", filePath, ":", json);
    res.json(venues);
  } catch (err) {
    console.error("Error reading JSON file:", err.message);
    res.status(500).json({ error: "Failed to read or parse file" });
  }
});

router.get("/test-venue-data-by-buildingType", async (req, res) => {
  const buildingType = req.query.buildingType;
  if (!buildingType) {
    return res
      .status(400)
      .json({ error: "Missing 'buildingType' query parameter" });
  }
  try {
    const venues = await mongoDbService.getCollection(MONGO_COLLECTIONS.VENUE);
    const results = await venues.find({ buildingType: buildingType }).toArray();
    res.json({ count: results.length, venues: results });
  } catch (err) {
    console.error("Error fetching venues by buildingType:", err.message);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// Upsert venue and buildingData atomically using MongoDB transactions

// Optionally, keep the home page route if needed
// router.get("/", (req, res) => {
//   res.render("index", { title: "Express" });
// });

export default router;
