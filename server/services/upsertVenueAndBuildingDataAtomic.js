import { MongoDbService } from "../dbServices/MongoDbService.js";
import { MONGO_COLLECTIONS } from "../../config/collections.js";
import { getMongoClient } from "../dbServices/mongoClient.js";

/**
 * Atomically upserts venue and building data into MongoDB using a transaction.
 * @param {object} param0 - { venue, buildingData } from Utils.convertToVenueMongoDBTable
 * @param {MongoDbService} mongoDbService - Instance of MongoDbService
 * @param {object} [session] - Optional MongoDB session
 * @returns {Promise<{venueResult: {success: boolean, error?: string}, buildingResult: {success: boolean, error?: string}}>}
 */
async function upsertVenueAndBuildingDataAtomic(
  { venue, buildingData },
  mongoDbService,
  session = null
) {
  let localSession = null;
  let startedSession = false;
  let venueResult = { success: false };
  let buildingResult = { success: false };

  try {
    if (!session) {
      // Start a new session if not provided
      const client = await getMongoClient();
      localSession = client.startSession();
      session = localSession;
      startedSession = true;
    }

    await session.withTransaction(async () => {
      // Upsert VENUE
      try {
        await mongoDbService
          .getCollection(MONGO_COLLECTIONS.VENUE)
          .replaceOne({ venue_id: venue.id }, venue, { upsert: true, session });
        venueResult.success = true;
      } catch (err) {
        venueResult = { success: false, error: err.message };
        throw err;
      }

      // Upsert BUILDING_DATA
      try {
        await mongoDbService
          .getCollection(MONGO_COLLECTIONS.BUILDING_DATA)
          .replaceOne({ venue_id: buildingData.venue_id }, buildingData, {
            upsert: true,
            session,
          });
        buildingResult.success = true;
      } catch (err) {
        buildingResult = { success: false, error: err.message };
        throw err;
      }
    });
  } catch (err) {
    // Transaction will be rolled back automatically
    if (!venueResult.error)
      venueResult = { success: false, error: err.message };
    if (!buildingResult.error)
      buildingResult = { success: false, error: err.message };
  } finally {
    if (localSession) await localSession.endSession();
  }

  return { venueResult, buildingResult };
}

// Add getCollection helper to MongoDbService if not present
// Example usage:
// const utils = new Utils();
// const { venue, buildingData } = utils.convertToVenueMongoDBTable(data);
// const result = await upsertVenueAndBuildingDataAtomic({ venue, buildingData }, mongoDbService);
