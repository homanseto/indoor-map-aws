import fs from "fs";
import path from "path";
import { MongoDbService } from "../dbServices/MongoDbService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { getMongoClient } from "../dbServices/mongoClient.js";

export class Utils {
  async convertToVenueMongoDBTable(data) {
    try {
      console.log(data);
      data.address = data.address.content.features;
      data.building = data.building.content.features;
      data.footprint = data.footprint.content.features;
      data.level = data.level.content.features;
      data.unit = data.unit.content.features;
      data.opening = data.opening.content.features;
      data.window = data.window ? data.window.content.features : null;
      data.amenities =
        data.buildingType === "MTR"
          ? data.amenity.content.features
          : data.amenities.content.features;
      data.anchors =
        data.buildingType === "MTR" && data.anchor
          ? data.anchor.content.features
          : data.anchors
          ? data.anchors.content.features
          : null;
      data.occupants =
        data.buildingType === "MTR" && data.occupant
          ? data.occupant.content.features
          : data.occupants
          ? data.occupants.content.features
          : null;
      data.venue = data.venue.content.features;

      const venue = data.venue[0];
      const venueId = venue.id;
      venue.properties.height = data.height;
      venue.properties.min_height = data.min_height;
      venue.buildingType = data.buildingType;
      venue.region = data.region;
      venue.displayName = data.displayName;
      venue.buildingName = data.buildingName;
      venue.LastAmendmentDate = data.LastAmendmentDate;
      if (data.occupants && data.anchors) {
        this.joinOccupantwithAnchor(data);
      }
      const errorAddingVenue = this.addVenueIdToAllFeatures(data, venueId);
      if (typeof errorAddingVenue === "string") {
        return errorAddingVenue;
      }
      data.venue_id = venueId;
      delete data.venue;
      delete data.anchors;
      if (data.buildingType === "MTR") {
        delete data.occupant;
        delete data.amenity;
        delete data.anchor;
      }
      // Return both the venue and the cleaned data for further use
      const result = await this.upsertVenueAndBuildingDataWithoutTransaction({
        venue,
        buildingData: data,
      });
      return result;
    } catch (error) {
      console.log(error);
      return DataTransfer.displayName;
    }
  }

  joinOccupantwithAnchor(data) {
    try {
      const anchors = data.anchors;
      data.occupants.forEach((occ) => {
        const matchedAnchor = anchors.find(
          (anc) => anc.id === occ.properties.anchor_id
        );
        if (matchedAnchor) {
          occ.geometry = matchedAnchor.geometry;
          if (occ.properties.name) {
            occ.properties.nameEn = occ.properties.name.en
              ? occ.properties.name.en
              : "";
            occ.properties.nameZh = occ.properties.name.zh
              ? occ.properties.name.zh
              : "";
          } else {
            occ.properties.nameEn = "";
            occ.properties.nameZh = "";
          }

          delete occ.properties.anchor_id;
        }
      });
    } catch (error) {
      console.log(error);
    }
  }

  addVenueIdToAllFeatures(data, venueId) {
    try {
      data.address.forEach((a) => {
        a.properties.venue_id = venueId;
      });
      data.building.forEach((b) => {
        b.properties.venue_id = venueId;
      });
      data.footprint.forEach((f) => {
        f.properties.venue_id = venueId;
      });
      data.level.forEach((l) => {
        l.properties.venue_id = venueId;
        l.properties.zValue =
          l.geometry.type === "Polygon"
            ? l.geometry.coordinates[0][0][2]
            : l.geometry.coordinates[0][0][0][2];
      });
      data.unit.forEach((u) => {
        u.properties.venue_id = venueId;
        u.properties.zValue = u.geometry.coordinates[0][0][2];
        u.properties.nameEn =
          u.properties.name && u.properties.name.en ? u.properties.name.en : "";
        u.properties.nameZh =
          u.properties.name && u.properties.name.zh ? u.properties.name.zh : "";
        delete u.properties.name;
      });
      if (data.amenities) {
        data.amenities.forEach((am) => {
          am.properties.venue_id = venueId;
          am.properties.zValue = am.geometry.coordinates[2];
          am.properties.nameEn = am.properties.name.en;
          am.properties.nameZh = am.properties.name.zh
            ? am.properties.name.zh
            : "";
          delete am.properties.name;
        });
      }

      if (data.occupants) {
        data.occupants.forEach((o) => {
          o.properties.venue_id = venueId;
          o.properties.zValue = o.geometry.coordinates[2];
        });
      }

      data.opening.forEach((o) => {
        o.properties.venue_id = venueId;
        o.properties.zValue = o.geometry.coordinates[0][2];
        o.properties.automatic = o.properties.door.automatic
          ? o.properties.door.automatic
          : false;
        o.properties.material = o.properties.door.material
          ? o.properties.door.material
          : null;
        o.properties.doorType = o.properties.door.type
          ? o.properties.door.type
          : null;
        delete o.properties.door;
      });
      if (data.window) {
        data.window.forEach((w) => {
          w.properties.venue_id = venueId;
          w.properties.zValue = w.geometry.coordinates[0][2];
        });
      }

      return data;
    } catch (err) {
      console.error("Error in addVenueIdToAllFeatures:", err);
      return data.displayName;
    }
  }

  async upsertVenueAndBuildingDataWithoutTransaction({ venue, buildingData }) {
    const client = await getMongoClient();
    let result;
    try {
      // Use the same client and session for all operations
      const db = client.db(process.env.MONGO_INITDB_DATABASE);
      const venueCollection = db.collection(MONGO_COLLECTIONS.VENUE);
      const buildingCollection = db.collection(MONGO_COLLECTIONS.BUILDING_DATA);

      await venueCollection.replaceOne({ id: venue.id }, venue, {
        upsert: true,
      });
      await buildingCollection.replaceOne(
        { venue_id: buildingData.venue_id },
        buildingData,
        { upsert: true }
      );
      return {
        success: true,
        message: "Upsert venue and indoor_data successful",
      };
    } catch (err) {
      // If any error occurs, the transaction is automatically aborted by withTransaction
      return { success: false, message: err.message };
    }
  }

  async upsertVenueAndBuildingDataAtomic({ venue, buildingData }) {
    const client = await getMongoClient();
    const session = client.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        // Use the same client and session for all operations
        const db = client.db(process.env.MONGO_INITDB_DATABASE);
        const venueCollection = db.collection(MONGO_COLLECTIONS.VENUE);
        const buildingCollection = db.collection(
          MONGO_COLLECTIONS.BUILDING_DATA
        );

        await venueCollection.replaceOne({ id: venue.id }, venue, {
          upsert: true,
          session,
        });
        await buildingCollection.replaceOne(
          { venue_id: buildingData.venue_id },
          buildingData,
          { upsert: true, session }
        );
      });
      result = {
        success: true,
        message: "Upsert venue and indoor_data successful",
      };
    } catch (err) {
      // If any error occurs, the transaction is automatically aborted by withTransaction
      result = { success: false, message: err.message };
    } finally {
      await session.endSession();
      return result;
    }
  }
  convertToCesiumFeatureCollection(buildingData) {
    console.log(buildingData);
    const levelNumber = buildingData.level.length;
    const levelidMap = new Map();
    buildingData.level.forEach((level) => {
      levelidMap.set(level.id, level);
    });
    const levelFloorPolyIdMap = new Map();
    buildingData.level.forEach((level) => {
      if (level.properties.FloorPolyID) {
        levelFloorPolyIdMap.set(level.properties.FloorPolyID, level);
      }
    });
    const levelFeatureCollection = {
      type: "FeatureCollection",
      totalFeatures: levelNumber,
      features: buildingData.level.map((level, i) => {
        const properties = level.properties;
        properties.feature_type = "level";
        properties.buildingType = buildingData.buildingType; // add buildingType to properties
        properties.displayName = buildingData.displayName;
        properties.buildingName = buildingData.buildingName;
        properties.LastAmendmentDate = buildingData.LastAmendmentDate;
        properties.region = buildingData.region;
        properties.venue_id = buildingData.venue_id;
        return {
          type: "Feature",
          id: level.id,
          geometry: level.geometry,
          properties: properties,
        };
      }),
    };
    const unitNumber = buildingData.unit.length;
    const unitFeatureCollection = {
      type: "FeatureCollection",
      totalFeatures: unitNumber,
      features: buildingData.unit.map((unit, i) => {
        const matchLevel = levelidMap.get(unit.properties.level_id);
        const properties = unit.properties;
        // if (unit.properties.restriction === "restricted") {
        //   properties.category = "restricted";
        // }
        properties.feature_type = "unit";
        properties.buildingType = buildingData.buildingType; // add buildingType to properties
        properties.displayName = buildingData.displayName;
        properties.buildingName = buildingData.buildingName;
        properties.LastAmendmentDate = buildingData.LastAmendmentDate;
        properties.region = buildingData.region;
        properties.venue_id = buildingData.venue_id;
        properties.levelEnName =
          matchLevel && matchLevel.properties.name.en
            ? matchLevel.properties.name.en
            : "";
        properties.levelZhName =
          matchLevel && matchLevel.properties.name.zh
            ? matchLevel.properties.name.zh
            : "";
        properties.levelShortName = matchLevel
          ? matchLevel.properties.short_name.en
          : "";
        properties.ordinal = matchLevel ? matchLevel.properties.ordinal : null;
        return {
          type: "Feature",
          id: unit.id,
          geometry: unit.geometry,
          properties: properties,
        };
      }),
    };
    const openingNumber = buildingData.opening.length;
    const openingFeatureCollection = {
      type: "FeatureCollection",
      totalFeatures: openingNumber,
      features: buildingData.opening.map((opening, i) => {
        const matchLevel = levelidMap.get(opening.properties.level_id);
        const properties = opening.properties;
        properties.feature_type = "opening";
        properties.buildingType = buildingData.buildingType; // add buildingType to properties
        properties.displayName = buildingData.displayName;
        properties.buildingName = buildingData.buildingName;
        properties.LastAmendmentDate = buildingData.LastAmendmentDate;
        properties.region = buildingData.region;
        properties.venue_id = buildingData.venue_id;
        properties.levelEnName =
          matchLevel && matchLevel.properties.name.en
            ? matchLevel.properties.name.en
            : "";
        properties.levelZhName =
          matchLevel && matchLevel.properties.name.zh
            ? matchLevel.properties.name.zh
            : "";
        properties.levelShortName = matchLevel
          ? matchLevel.properties.short_name.en
          : "";
        properties.ordinal = matchLevel ? matchLevel.properties.ordinal : null;
        return {
          type: "Feature",
          id: opening.id,
          geometry: opening.geometry,
          properties: properties,
        };
      }),
    };
    let windowFeatureCollection = null;
    if (buildingData.window) {
      const windowNumber = buildingData.window.length;
      windowFeatureCollection = {
        type: "FeatureCollection",
        totalFeatures: windowNumber,
        features: buildingData.window.map((window, i) => {
          const matchLevel = levelFloorPolyIdMap.get(
            window.properties.FloorPolyID
          );
          const properties = window.properties;
          properties.feature_type = "window";
          properties.buildingType = buildingData.buildingType; // add buildingType to properties
          properties.displayName = buildingData.displayName;
          properties.buildingName = buildingData.buildingName;
          properties.LastAmendmentDate = buildingData.LastAmendmentDate;
          properties.region = buildingData.region;
          properties.venue_id = buildingData.venue_id;
          properties.level_id = matchLevel ? matchLevel.id : "";
          properties.levelEnName =
            matchLevel && matchLevel.properties.name.en
              ? matchLevel.properties.name.en
              : "";
          properties.levelZhName =
            matchLevel && matchLevel.properties.name.zh
              ? matchLevel.properties.name.zh
              : "";
          properties.levelShortName = matchLevel
            ? matchLevel.properties.short_name.en
            : "";
          properties.ordinal = matchLevel
            ? matchLevel.properties.ordinal
            : null;
          return {
            type: "Feature",
            id: window.id,
            geometry: window.geometry,
            properties: properties,
          };
        }),
      };
    }

    let unitMapWithLevelInfo = new Map();
    if (unitFeatureCollection.features.length > 0) {
      unitFeatureCollection.features.forEach((unit) => {
        unitMapWithLevelInfo.set(unit.id, unit);
      });
    }
    let amenitiesFeatureCollection = null;
    if (buildingData.amenities) {
      const amenitiesNumber = buildingData.amenities.length;
      amenitiesFeatureCollection = {
        type: "FeatureCollection",
        totalFeatures: amenitiesNumber,
        features: buildingData.amenities.map((amenity, i) => {
          const properties = amenity.properties;
          const matchUnit = unitMapWithLevelInfo.get(
            amenity.properties.unit_ids[0]
          );
          properties.feature_type = "amenity";
          properties.buildingType = buildingData.buildingType; // add buildingType to properties
          properties.displayName = buildingData.displayName;
          properties.buildingName = buildingData.buildingName;
          properties.LastAmendmentDate = buildingData.LastAmendmentDate;
          properties.region = buildingData.region;
          properties.venue_id = buildingData.venue_id;
          properties.unit_id = properties.unit_ids[0];
          properties.level_id = matchUnit ? matchUnit.properties.level_id : "";
          properties.levelShortName = matchUnit
            ? matchUnit.properties.levelShortName
            : "";
          properties.ordinal = matchUnit ? matchUnit.properties.ordinal : null;
          return {
            type: "Feature",
            id: amenity.id,
            geometry: amenity.geometry,
            properties: properties,
          };
        }),
      };
    }
    let occupantFeatureCollection = null;
    if (buildingData.occupants) {
      const occupantNumber = buildingData.occupants.length;
      occupantFeatureCollection = {
        type: "FeatureCollection",
        totalFeatures: occupantNumber,
        features: buildingData.occupants.map((occupant, i) => {
          const properties = occupant.properties;
          const matchUnit = unitMapWithLevelInfo.get(
            occupant.properties.unit_id
          );
          properties.feature_type = "occupant";
          properties.buildingType = buildingData.buildingType; // add buildingType to properties
          properties.displayName = buildingData.displayName;
          properties.buildingName = buildingData.buildingName;
          properties.LastAmendmentDate = buildingData.LastAmendmentDate;
          properties.region = buildingData.region;
          properties.venue_id = buildingData.venue_id;
          properties.level_id = matchUnit ? matchUnit.properties.level_id : "";
          properties.levelShortName = matchUnit
            ? matchUnit.properties.levelShortName
            : "";
          properties.ordinal = matchUnit ? matchUnit.properties.ordinal : null;
          return {
            type: "Feature",
            id: occupant.id,
            geometry: occupant.geometry,
            properties: properties,
          };
        }),
      };
    }

    const joined = {
      venue_id: buildingData.venue_id,
      levels: levelFeatureCollection,
      units: unitFeatureCollection,
      openings: openingFeatureCollection,
    };
    if (windowFeatureCollection) joined.windows = windowFeatureCollection;
    if (occupantFeatureCollection) joined.occupants = occupantFeatureCollection;
    if (amenitiesFeatureCollection)
      joined.amenities = amenitiesFeatureCollection;
    return joined;
  }
  readAllFilesInFolder = async (folderPath) => {
    try {
      // Read all files and directories in the folder
      const files = await fs.readdirSync(folderPath);

      // Filter out directories and read only files
      // const filePromises = files.map(async (file) => {
      //   const filePath = path.join(folderPath, file);
      //   const stats = await fs.stat(filePath);

      //   if (stats.isFile()) {
      //     // Read the file content
      //     const content = await fs.readFileSync(filePath, "utf-8");
      //     return {
      //       fileName: file,
      //       content: content,
      //     };
      //   }
      //   return null;
      // });

      // // Wait for all file reads to complete
      // const fileContents = await Promise.all(filePromises);

      // // Filter out null values (directories)
      // return fileContents.filter(Boolean);
    } catch (error) {
      console.error("Error reading files:", error);
      throw error;
    }
  };
}
