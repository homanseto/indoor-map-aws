import express from "express";
import jwt from "jsonwebtoken";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { MongoDbService } from "../dbServices/MongoDbService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { Utils } from "../services/utils.js";
import { NetworkService } from "../services/networkService.js";

const router = express.Router();
const networkService = new NetworkService();
const utils = new Utils();

const USER_BUILDING_TYPE = {
  ha: "HA",
  lcsd: "LCSD",
  dh: "DH",
  mtr: "MTR",
};

// POST /testing/import-indoor-network - Import indoor network data from JSON to PostGIS
router.post("/import-indoor-network", async (req, res) => {
  try {
    const { filePath, batchSize = 50, clearExisting = true } = req.body;

    // Validate required parameters
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: filePath",
      });
    }

    // Construct full path relative to project root
    const fullPath = path.join("./testing-data/network", filePath);

    console.log(`🚀 Starting indoor network import request for: ${fullPath}`);

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
    const progressCallback = (progress) => {
      progressData = progress;
      console.log(
        `📊 Import Progress: ${progress.progressPercent}% (Batch ${progress.batchIndex}/${progress.totalBatches})`
      );
    };

    // Execute the import
    const importResults = await networkService.importIndoorNetwork(fullPath, {
      batchSize: parseInt(batchSize),
      clearExisting: Boolean(clearExisting),
      progressCallback,
    });

    console.log(`✅ Import completed successfully:`, importResults);

    // Return comprehensive results
    res.status(200).json({
      success: true,
      message: "Indoor network import completed successfully",
      results: importResults,
      finalProgress: progressData,
    });
  } catch (error) {
    console.error(`❌ Import failed:`, error);

    res.status(500).json({
      success: false,
      error: error.message,
      type: "ImportError",
    });
  }
});

// GET /testing/network-data/:venue_id - Get import statistics for a venue
router.get("/network_data", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    let username;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      username = decoded.username;
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const { venue_id } = req.query;

    if (!venue_id) {
      return res.status(400).json({
        success: false,
        error: "Missing venue_id parameter",
      });
    }

    // Authorization: only allow access to venues user is allowed to see
    let allowedBuildingType = null;
    if (username && username.toLowerCase() !== "admin") {
      allowedBuildingType = USER_BUILDING_TYPE[username.toLowerCase()];
      if (!allowedBuildingType) {
        return res.status(403).json({ error: "Unauthorized user" });
      }
    }

    const result = await networkService.networkGeoJSONScheme(venue_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "No network data found for this venue",
        venue_id,
      });
    }
    if (
      allowedBuildingType &&
      result.buildingType.replace(" ", "") !== "MTR" &&
      result.buildingType.replace(" ", "") !== allowedBuildingType
    ) {
      return res
        .status(403)
        .json({ error: "Unauthorized user for this venue" });
    }

    res.status(200).json({
      success: true,
      venue_id,
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

export default router;
