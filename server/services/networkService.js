import pool from "../dbServices/pgPool.js";
import { PostgisService } from "../dbServices/PostgisService.js";
import fs from "fs/promises";
import { JsonFileService } from "./JsonFileService.js";
import { features } from "process";

export class NetworkService {
  constructor() {
    this.postgisService = new PostgisService();
    this.jsonService = new JsonFileService();
  }

  /**
   * Import Indoor Network data from JSON file to PostGIS database
   * @param {string} jsonFilePath - Path to the network JSON file
   * @param {Object} options - Import options
   * @param {number} options.batchSize - Number of features to process per batch
   * @param {boolean} options.clearExisting - Whether to clear existing data first
   * @param {Function} options.progressCallback - Callback for progress updates
   * @returns {Object} Import results with statistics
   */
  async importIndoorNetwork(jsonFilePath, options = {}) {
    const {
      batchSize = this.defaultBatchSize,
      clearExisting = true,
      progressCallback = null,
    } = options;

    console.log(`🚀 Starting indoor network import from: ${jsonFilePath}`);
    const startTime = Date.now();

    try {
      // Step 1: Read and validate JSON file
      const networkData = await this.readAndValidateNetworkJson(jsonFilePath);
      console.log(`📄 Loaded ${networkData.features.length} network features`);

      // Step 2: Clear existing data if requested
      if (clearExisting) {
        await this.clearIndoorNetworkData(networkData.venue_id);
      }

      // Step 3: Validate all features before processing
      const validationResults = await this.validateNetworkFeatures(
        networkData.features
      );
      if (validationResults.errors.length > 0) {
        throw new Error(
          `Validation failed: ${validationResults.errors.join(", ")}`
        );
      }
      console.log(
        `✅ All ${validationResults.validCount} features passed validation`
      );

      // Step 4: Process features in batches
      const importResults = await this.processFeaturesInBatches(
        networkData,
        batchSize,
        progressCallback
      );

      const duration = Date.now() - startTime;
      console.log(`🎉 Import completed in ${duration}ms`);

      return {
        success: true,
        duration,
        totalFeatures: networkData.features.length,
        ...importResults,
      };
    } catch (error) {
      console.error(`❌ Import failed:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async readAndValidateNetworkJson(filePath) {
    try {
      const data = await this.jsonService.readJson(filePath);

      // Basic structure validation
      if (!data.type || data.type !== "FeatureCollection") {
        throw new Error("Invalid GeoJSON: must be a FeatureCollection");
      }

      if (!data.features || !Array.isArray(data.features)) {
        throw new Error("Invalid GeoJSON: features must be an array");
      }

      if (data.features.length === 0) {
        throw new Error("No features found in the GeoJSON file");
      }

      // Extract venue_id from the document
      if (!data.venue_id) {
        throw new Error("Missing venue_id in the network data");
      }

      return data;
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Clear existing indoor network data for a specific venue
   */
  async clearIndoorNetworkData(venueId) {
    console.log(`🧹 Clearing existing data for venue: ${venueId}`);

    const result = await this.postgisService.query(
      "DELETE FROM indoor_network WHERE venue_id = $1",
      [venueId]
    );

    console.log(`🗑️ Removed ${result.rowCount} existing records`);
    return result.rowCount;
  }

  /**
   * Validate all network features before processing
   */
  async validateNetworkFeatures(features) {
    console.log("🔍 Validating network features...");

    const errors = [];
    let validCount = 0;

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const featureErrors = this.validateSingleFeature(feature, i);

      if (featureErrors.length > 0) {
        errors.push(...featureErrors);
      } else {
        validCount++;
      }
    }

    return { errors, validCount, totalCount: features.length };
  }

  /**
   * Validate a single network feature
   */
  validateSingleFeature(feature, index) {
    const errors = [];
    const prefix = `Feature ${index}`;

    // Check basic feature structure
    if (!feature.type || feature.type !== "Feature") {
      errors.push(`${prefix}: Invalid feature type`);
    }

    if (!feature.geometry) {
      errors.push(`${prefix}: Missing geometry`);
    } else {
      // Validate geometry
      if (feature.geometry.type !== "LineString") {
        errors.push(
          `${prefix}: Expected LineString geometry, got ${feature.geometry.type}`
        );
      }

      if (
        !feature.geometry.coordinates ||
        !Array.isArray(feature.geometry.coordinates)
      ) {
        errors.push(`${prefix}: Invalid coordinates array`);
      } else if (feature.geometry.coordinates.length < 2) {
        errors.push(`${prefix}: LineString must have at least 2 coordinates`);
      } else {
        // Validate coordinate format (should be [lng, lat, z])
        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
          const coord = feature.geometry.coordinates[i];
          if (!Array.isArray(coord) || coord.length < 2) {
            errors.push(`${prefix}: Invalid coordinate format at index ${i}`);
          }
        }
      }
    }

    // Validate required properties
    if (!feature.properties) {
      errors.push(`${prefix}: Missing properties`);
    } else {
      const props = feature.properties;

      if (!props.iNetworkID) {
        errors.push(`${prefix}: Missing required field: iNetworkID`);
      }

      if (!props.PedestrianRouteID) {
        errors.push(`${prefix}: Missing required field: PedestrianRouteID`);
      }

      if (!props.level_id) {
        errors.push(`${prefix}: Missing required field: level_id`);
      }
    }

    return errors;
  }

  /**
   * Process features in batches with progress tracking
   */
  async processFeaturesInBatches(networkData, batchSize, progressCallback) {
    const features = networkData.features.filter(
      (f) => f.properties.Restricted === "N"
    );
    const totalBatches = Math.ceil(features.length / batchSize);
    let processedFeatures = 0;
    let insertedRecords = 0;
    const batchResults = [];

    console.log(
      `📦 Processing ${features.length} features in ${totalBatches} batches of ${batchSize}`
    );

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, features.length);
      const batchFeatures = features.slice(startIdx, endIdx);

      console.log(
        `⚡ Processing batch ${batchIndex + 1}/${totalBatches} (${
          batchFeatures.length
        } features)`
      );

      try {
        const batchResult = await this.insertFeatureBatch(
          batchFeatures,
          networkData
        );
        insertedRecords += batchResult.insertedCount;
        batchResults.push(batchResult);

        processedFeatures += batchFeatures.length;
        const progressPercent = Math.round(
          (processedFeatures / features.length) * 100
        );

        console.log(
          `✅ Batch ${batchIndex + 1} completed: ${
            batchResult.insertedCount
          } inserted (${progressPercent}%)`
        );

        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            batchIndex: batchIndex + 1,
            totalBatches,
            processedFeatures,
            totalFeatures: features.length,
            progressPercent,
            insertedRecords,
          });
        }
      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
        throw new Error(
          `Batch processing failed at batch ${batchIndex + 1}: ${error.message}`
        );
      }
    }

    return {
      processedFeatures,
      insertedRecords,
      batchResults,
      totalBatches,
    };
  }

  /**
   * Insert a batch of features into the database
   */
  async insertFeatureBatch(features, networkData) {
    const client = await pool.connect();

    let errFeature = {};
    try {
      await client.query("BEGIN");

      const insertedRecords = [];

      for (const feature of features) {
        errFeature = feature;
        const record = this.transformFeatureToRecord(feature, networkData);
        const result = await this.insertSingleRecord(client, record);
        insertedRecords.push(result);
      }

      await client.query("COMMIT");

      return {
        insertedCount: insertedRecords.length,
        records: insertedRecords,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.log(errFeature);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transform a GeoJSON feature to database record
   */
  transformFeatureToRecord(feature, networkData) {
    const props = feature.properties;
    const geom = feature.geometry;

    // Convert GeoJSON coordinates to WKT format for PostGIS
    const coordinates = geom.coordinates
      .map((coord) => `${coord[0]} ${coord[1]} ${coord[2] || 0}`)
      .join(",");
    const wkt = `LINESTRING Z(${coordinates})`;

    return {
      // Network identifiers
      pedestrianrouteid: props.PedestrianRouteID,
      inetworkid: props.iNetworkID,
      floorpolyid: props.FloorPolyID,

      // Level and building information
      level_id: props.level_id,
      level_english_name: props.LevelEnglishName,
      level_chinese_name: props.LevelChineseName,
      buildingname_eng: props.BuildingNameEng,
      buildingname_chi: props.BuildingNameChi,

      // Alias names
      aliasname_en: props.AliasNameEN,
      aliasname_tc: props.AliasNameTC,

      // Route properties
      highway: props.highway,
      oneway: props.oneway,
      wheelchair: props.wheelchair,
      emergency: props.emergency,
      exit: props.exit ? true : false,
      restricted: props.Restricted,

      // Access codes
      wheelchairaccess: props.WheelchairAccess,
      wheelchairbarrier: props.WheelchairBarrier,
      weatherproof: props.WeatherProof,
      featuretype: props.FeatureType,

      // Metadata fields
      creation_date: props.CreationDate,
      creation_by: props.Creation_by,
      lastamendment_date: props.LastAmendmentDate,
      lastamendment_by: props.LastAmendment_by,

      // Collection metadata
      venue_id: networkData.venue_id,
      display_name: networkData.displayName,
      region: networkData.region,
      building_type: networkData.buildingType[0],

      // Geometry (WKT format)
      geom_wkt: wkt,
    };
  }

  /**
   * Insert a single record into the database
   */
  async insertSingleRecord(client, record) {
    const insertSQL = `
      INSERT INTO indoor_network (
        pedestrianrouteid, inetworkid, floorpolyid,
        level_id, level_english_name, level_chinese_name,
        aliasname_en, aliasname_tc, highway, oneway, wheelchair, emergency, exit, restricted,
        wheelchairaccess, featuretype, creation_date, creation_by, lastamendment_date, lastamendment_by,
        venue_id, buildingname_eng, buildingname_chi, display_name, region, building_type, geom,wheelchairbarrier,weatherproof
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        ST_GeomFromText($27, 4326),$28,$29
      ) RETURNING pedestrianrouteid, inetworkid
    `;

    const values = [
      record.pedestrianrouteid, //1
      record.inetworkid, //2
      record.floorpolyid, //3
      record.level_id, //4
      record.level_english_name, //5
      record.level_chinese_name, //6
      record.aliasname_en, //7
      record.aliasname_tc, //8
      record.highway, //9
      record.oneway, //10
      record.wheelchair, //11
      record.emergency, //12
      record.exit, //13
      record.restricted, //14
      record.wheelchairaccess, //15
      record.featuretype, //16
      record.creation_date, //17
      record.creation_by, //18
      record.lastamendment_date, //19
      record.lastamendment_by, //20
      record.venue_id, //21
      record.buildingname_eng, //22
      record.buildingname_chi, //23
      record.display_name, //24
      record.region, //25
      record.building_type, //26
      record.geom_wkt, //27
      record.wheelchairbarrier, //28
      record.weatherproof, //29
    ];

    const result = await client.query(insertSQL, values);
    return result.rows[0];
  }

  /**
   * Get import st
   *   */
  async getNetworkByVenueId(venueId) {
    const statsSQL = `
      SELECT *, ST_AsGeoJSON(geom) AS geometry
      FROM indoor_network 
      WHERE venue_id = $1
    `;

    const result = await this.postgisService.query(statsSQL, [venueId]);
    return result.rows;
  }

  async networkGeoJSONScheme(venueId) {
    const networks = await this.getNetworkByVenueId(venueId);
    if (!networks || networks.length === 0) {
      return null;
    } else {
      const result = {
        totalRecords: networks.length,
        buildingType: networks[0].building_type,
        displayName: networks[0].display_name,
        featureCollection: {
          type: "FeatureCollection",
          name: "3D Indoor Network",
          features: networks.map((net) => ({
            type: "Feature",
            id: net.inetworkid,
            feature_type: "indoor_network",
            properties: {
              iNetworkID: net.inetworkid,
              PedestrianRouteID: net.pedestrianrouteid,
              FloorPolyID: net.floorpolyid,
              level_id: net.level_id,
              AliasNameEN: net.aliasname_en,
              AliasNameTC: net.aliasname_tc,
              highway: net.highway,
              oneway: net.oneway,
              wheelchair: net.wheelchair,
              emergency: net.emergency,
              exit: net.exit,
              restricted: net.restricted,
              WheelchairAccess: net.wheelchairaccess,
              Wheelchairbarrier: net.wheelchairbarrier,
              Weatherproof: net.weatherproof,
              feature_type: net.featuretype,
              CreationDate: net.creation_date,
              Creation_by: net.creation_by,
              LastAmendmentDate: net.lastamendment_date,
              LastAmendment_by: net.lastamendment_by,
              venue_id: net.venue_id,
              buildingname_eng: net.buildingname_eng,
              buildingname_chi: net.buildingname_chi,
              display_name: net.display_name,
              region: net.region,
              building_type: net.building_type,
            },
            geometry: JSON.parse(net.geometry),
          })),
        },
      };
      return result;
    }
  }
}
