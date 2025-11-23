import express from "express";
import fs from "fs";
import path from "path";
import { MongoDbService } from "../dbServices/MongoDbService.js";
import { PostgisService } from "../dbServices/PostgisService.js";
import { JsonFileService } from "../services/JsonFileService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { POSTGIS_TABLE } from "../../config/postgistable.js";
import { Utils } from "../services/utils.js";
import { NetworkService } from "../services/networkService.js";

const router = express.Router();

const mongoDbName = process.env.MONGO_INITDB_DATABASE;
const mongoDbService = new MongoDbService(mongoDbName);
const postgisService = new PostgisService();
const networkService = new NetworkService();
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
  const testDir = "./testing-data/indoor/latest";
  const failedList = [];
  try {
    const jsonfiles = await fs.readdirSync(testDir);
    if (!fs.existsSync(testDir)) {
      return res.status(404).json({
        error: "Directory not found",
        path: testDir,
        message: "Please ensure testing-data directory is mounted or exists",
      });
    }
    if (jsonfiles.length === 0) {
      return res.status(404).json({
        error: "No JSON files found",
        path: testDir,
      });
    }
    for (let jf of jsonfiles) {
      const filePath = path.join(testDir, jf);
      if (!filePath) {
        return res
          .status(400)
          .json({ error: "Missing 'file' query parameter" });
      }
      const jsonService = new JsonFileService();
      const json = await jsonService.readJson(filePath);
      const venues = await utils.convertToVenueMongoDBTable(json.data);
      if (typeof venues === "string") {
        failedList.push(venues);
      }
      console.log("Read JSON from", filePath, ":", json);
    }
    res.json({
      success: true,
      processedFiles: jsonfiles.length,
      failedFiles: failedList.length,
      failures: failedList,
    });
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

// POST /testing/import-indoor-network - Import indoor network data from JSON to PostGIS
router.post("/import-indoor-network", async (req, res) => {
  const testDir = "./testing-data/network/latest";
  const failedList = [];
  try {
    const { batchSize = 50, clearExisting = true } = req.body;

    const jsonfiles = await fs.promises.readdir(testDir);
    if (!fs.existsSync(testDir)) {
      return res.status(404).json({
        error: "Directory not found",
        path: testDir,
        message: "Please ensure testing-data directory is mounted or exists",
      });
    }
    // Test PostGIS connection first
    const connectionOk = await postgisService.testConnection();
    if (!connectionOk) {
      return res.status(500).json({
        success: false,
        error: "PostGIS connection failed",
      });
    }

    // Track progress for API response
    let progressData = {};
    for (let jf of jsonfiles) {
      const filePath = path.join(testDir, jf);
      if (!filePath) {
        return res
          .status(400)
          .json({ error: "Missing 'file' query parameter" });
      }
      const progressCallback = (progress) => {
        progressData = progress;
        console.log(
          `📊 Import Progress: ${progress.progressPercent}% (Batch ${progress.batchIndex}/${progress.totalBatches})`
        );
      };
      // Execute the import
      const importResults = await networkService.importIndoorNetwork(filePath, {
        batchSize: parseInt(batchSize),
        clearExisting: Boolean(clearExisting),
        progressCallback,
      });
      if (!importResults || !importResults.success) {
        failedList.push({
          file: jf,
          error: importResults.error,
        });
      }
    }

    // Return comprehensive results
    res.status(200).json({
      success: true,
      message: "Indoor network import completed successfully",
      failedList: failedList,
    });
  } catch (error) {
    console.error(`❌ Import failed:`, error);

    res.status(500).json({
      success: false,
      failedList: failedList,
      error: error.message,
      type: "ImportError",
    });
  }
});

// GET /testing/network-data/:venueId - Get import statistics for a venue
router.get("/network-data", async (req, res) => {
  try {
    const { venueId } = req.query;

    if (!venueId) {
      return res.status(400).json({
        success: false,
        error: "Missing venueId parameter",
      });
    }

    const result = await networkService.networkGeoJSONScheme(venueId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No network data found for this venue",
        venueId,
      });
    }

    res.status(200).json({
      success: true,
      venueId,
      result: result,
    });
  } catch (error) {
    console.error(`❌ Failed to get network stats:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /testing/postgis-connection - Test PostGIS database connectivity
router.get("/postgis-connection", async (req, res) => {
  try {
    const isConnected = await postgisService.testConnection();

    if (isConnected) {
      res.status(200).json({
        success: true,
        message: "PostGIS connection successful",
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: "PostGIS connection failed",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Upsert venue and buildingData atomically using MongoDB transactions

// Optionally, keep the home page route if needed
// router.get("/", (req, res) => {
//   res.render("index", { title: "Express" });
// });

export default router;
