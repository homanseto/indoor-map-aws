import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import { MongoDbService } from "../dbServices/MongoDbService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { Utils } from "../services/utils.js";

const router = express.Router();
const mongoDbService = new MongoDbService(process.env.MONGO_INITDB_DATABASE);
const utils = new Utils();

// Example protected POST endpoint
router.post("/external-protected", apiKeyAuth, (req, res) => {
  res.json({ message: "API key authentication successful!" });
});

// Hardcoded username to buildingType mapping
const USER_BUILDING_TYPE = {
  ha: "HA",
  lcsd: "LCSD",
  dh: "DH",
  mtr: "MTR",
};

// GET /venues - returns venues based on user access
router.get("/venues", async (req, res) => {
  try {
    // Extract JWT from cookie
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

    let query = {};
    if (username && username.toLowerCase() !== "admin") {
      const buildingType = USER_BUILDING_TYPE[username.toLowerCase()];
      if (!buildingType) {
        return res.status(403).json({ error: "Unauthorized user" });
      }
      query = {
        buildingType: {
          $in: [buildingType, "MTR"],
        },
      };
    }

    const venuesCol = await mongoDbService.getCollection(
      MONGO_COLLECTIONS.VENUE
    );
    const venues = await venuesCol.find(query).toArray();
    const featureCollection = {
      type: "FeatureCollection",
      totalFeatures: venues.length,
      features: venues.map((venue, i) => {
        const properties = venue.properties;
        properties.feature_type = "venue";
        properties.buildingType = venue.buildingType; // add buildingType to properties
        properties.displayName = venue.displayName;
        properties.buildingName = venue.buildingName;
        properties.LastAmendmentDate = venue.LastAmendmentDate;
        properties.region = venue.region;
        return {
          type: "Feature",
          id: venue.id,
          geometry: venue.geometry,
          properties: properties,
        };
      }),
    };
    res.json(featureCollection);
  } catch (err) {
    console.error("Error fetching venues:", err.message);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
});

// GET /building_data?venue_id=... - returns building data for a venue, with authorization
router.get("/building_data", async (req, res) => {
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

    const venueId = req.query.venue_id;
    if (!venueId) {
      return res.status(400).json({ error: "Missing venue_id parameter" });
    }

    // Authorization: only allow access to venues user is allowed to see
    let allowedBuildingType = null;
    if (username && username.toLowerCase() !== "admin") {
      allowedBuildingType = USER_BUILDING_TYPE[username.toLowerCase()];
      if (!allowedBuildingType) {
        return res.status(403).json({ error: "Unauthorized user" });
      }
    }

    // Get building data collection
    const buildingCol = await mongoDbService.getCollection(
      MONGO_COLLECTIONS.BUILDING_DATA
    );
    // Find the building data for the venue
    const buildingDoc = await buildingCol.findOne({ venue_id: venueId });
    if (!buildingDoc) {
      return res.status(404).json({ error: "Building data not found" });
    }
    const result = utils.convertToCesiumFeatureCollection(buildingDoc);

    // If not admin, check buildingType matches
    if (
      allowedBuildingType &&
      buildingDoc.buildingType !== "MTR" &&
      buildingDoc.buildingType !== allowedBuildingType
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: not allowed to access this venue's data" });
    }

    // Sanitize response: only send allowed fields
    res.json(result);
  } catch (err) {
    console.error("Error fetching building data:", err.message);
    res.status(500).json({ error: "Failed to fetch building data" });
  }
});

router.get("/icons/:category", async (req, res) => {
  try {
    const category = req.params.category;
    // Security: Only allow specific folders
    if (!["amenity", "occupant"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    const dirPath = path.resolve(`public/images/icon/${category}`);
    const files = await fs.readdirSync(dirPath);
    // Return only .svg files
    const svgFiles = files.filter((file) => file.endsWith(".svg"));
    res.json(svgFiles);
  } catch (err) {
    // Handle errors (like directory not found)
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: "Directory not found" });
    }
    console.error("Error reading icon directory:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
