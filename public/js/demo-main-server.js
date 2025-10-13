import { initializeCesiumViewer } from "./cesium-config.js";
import { BuildingIndoor } from "./modules/building-indoor.js";
import { ZClippingManager } from "./utils/zClippingManager.js";

// Global variables for demo management
let viewer;
let threeDTiles, PNTiles, indoorMTRTiles, indoorNetworkTiles, hikingTiles;

let activeVenues = new Map(); // Map<venueId, VenueIndoor>
let activeMTRStations = new Map(); // Map<venueId, MTRIndoor>
let hiddenVenuePolygons = new Set(); // Track hidden venue polygons
let hiddenMTRPolygons = new Set(); // Track hidden MTR polygons

// Map to manage active buildings (venueId -> BuildingIndoor)
let activeBuildings = new Map();

// Generic handler for selecting any indoor feature (unit, window, opening, amenity, occupant)
function handleIndoorFeatureClick(selectedEntity) {
  // Try to get venue_id from entity properties
  let venueId = null;
  if (
    selectedEntity &&
    selectedEntity.properties &&
    selectedEntity.properties.venue_id
  ) {
    venueId = selectedEntity.properties.venue_id.getValue
      ? selectedEntity.properties.venue_id.getValue()
      : selectedEntity.properties.venue_id;
  }
  if (!venueId || !activeBuildings.has(venueId)) return;

  // If already the active building, do nothing
  if (lastActiveVenueId === venueId) return;

  // Reset previous building's level bar and filtering to ALL
  if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
    const prevBuilding = activeBuildings.get(lastActiveVenueId);
    if (typeof prevBuilding.resetLevelBarAndShowAll === "function") {
      prevBuilding.resetLevelBarAndShowAll();
    }
  }

  // Update the level bar for the selected building
  const buildingIndoor = activeBuildings.get(venueId);
  if (typeof buildingIndoor.initLevelBar === "function") {
    buildingIndoor.initLevelBar();
  }
  lastActiveVenueId = venueId;
}
let lastActiveVenueId = null; // Track last active building for level bar reset

// Building Network Management
let activeBuildingNetworks = new Map(); // Map<venueId, {dataSource, data, loading}>
let buildingNetworkCache = new Map(); // Map<buildingName, networkData>

// Configurable API base URL for backend
// Use http://localhost:3001 for local debug, "" for production/Docker
const API_BASE_URL =
  window.location.port === "3001" ? "http://localhost:3001" : "";

// API endpoints
const venuePolygonApi =
  "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/venue_polygon";
const MTRvenuePolygonApi =
  "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_venue_polygon";

async function initDemo() {
  // Reuse Cesium viewer if already created by initCesiumBasemap
  viewer = window.viewer || null;
  if (!viewer) {
    viewer = initializeCesiumViewer("cesiumContainer");
    window.viewer = viewer;
    console.log("[demo-main-server] Created new Cesium viewer.");
  } else {
    console.log("[demo-main-server] Reusing existing Cesium viewer.");
  }
  const venueResponseFromServer = await fetch(
    `${API_BASE_URL}/api/smo3dm/venues`,
    {
      credentials: "same-origin",
    }
  );
  const venueGeoJson = await venueResponseFromServer.json();
  console.log("Fetched venue polygons:", venueGeoJson);
  await setupVenueDataSources(venueGeoJson);

  // Inject Z-clipping bar HTML
  const zClippingBarContainer = document.getElementById(
    "zClippingBarContainer"
  );
  if (zClippingBarContainer) {
    const resp = await fetch("./html/z-clipping-bar.html");
    const html = await resp.text();
    zClippingBarContainer.innerHTML = html;
  }

  setupVenueClickInteraction();
  // Wire up Z-clipping slider
  const slider = document.getElementById("z-clipping-slider");
  const valueLabel = document.getElementById("z-clipping-value");
  if (slider && valueLabel) {
    slider.addEventListener("input", (e) => {
      valueLabel.textContent = slider.value;
      // Apply Z-clipping to all loaded buildings
      ZClippingManager.applyToAllBuildings(
        activeBuildings,
        parseFloat(slider.value)
      );
    });
  }
}
async function setupVenueDataSources(venueGeoJson) {
  const venueDataSource = new Cesium.GeoJsonDataSource("venue_polygon");
  await venueDataSource.load(venueGeoJson, {
    stroke: new Cesium.Color(0.26, 0.52, 0.96, 0.5),
    fill: new Cesium.Color(0.26, 0.52, 0.96, 0.5),
    outline: false,
  });
  // Apply 3D properties to venue entities
  Object.values(venueDataSource.entities.values).forEach((entity) => {
    entity.name = entity.properties.name.en;
    entity.polygon.arcType = Cesium.ArcType.GEODESIC;
    entity.polygon.perPositionHeight = false;
    entity.polygon.extrudedHeight = entity.properties.height;
    entity.polygon.height = entity.properties.min_height;
    entity.polygon.closeTop = false;
  });
  viewer.dataSources.add(venueDataSource);
  const entities = venueDataSource.entities.values;
  if (entities.length > 0) {
    viewer.flyTo(entities[0]);
  }
}

function setupVenueClickInteraction() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(async (movement) => {
    try {
      const picked = viewer.scene.pick(movement.position);
      if (!Cesium.defined(picked)) {
        return;
      }
      const venueId = picked.id.id;
      const properties = picked.id.properties;
      const featureType = properties.feature_type
        ? properties.feature_type.getValue(Cesium.JulianDate.now())
        : undefined;
      if (!featureType) {
        return;
      }
      if (featureType === "venue") {
        // Get venue_id from properties
        if (!venueId) return;
        if (activeBuildings.has(venueId)) {
          // If already loaded, update the level bar and filtering to this building
          if (
            lastActiveVenueId &&
            activeBuildings.has(lastActiveVenueId) &&
            lastActiveVenueId !== venueId
          ) {
            const prevBuilding = activeBuildings.get(lastActiveVenueId);
            if (typeof prevBuilding.resetLevelBarAndShowAll === "function") {
              prevBuilding.resetLevelBarAndShowAll();
            }
          }
          const buildingIndoor = activeBuildings.get(venueId);
          if (typeof buildingIndoor.initLevelBar === "function") {
            buildingIndoor.initLevelBar();
          }
          lastActiveVenueId = venueId;
          return;
        }
        // Reset previous building's level bar and filtering to ALL
        if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
          const prevBuilding = activeBuildings.get(lastActiveVenueId);
          if (typeof prevBuilding.resetLevelBarAndShowAll === "function") {
            prevBuilding.resetLevelBarAndShowAll();
          }
        }
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/smo3dm/building_data?venue_id=${encodeURIComponent(
              venueId
            )}`,
            {
              credentials: "same-origin",
            }
          );
          if (response.ok) {
            const buildingData = await response.json();
            // Instantiate BuildingIndoor and add to activeBuildings
            const buildingIndoor = new BuildingIndoor(viewer, buildingData);
            activeBuildings.set(venueId, buildingIndoor);
            // Hide the venue entity
            picked.id.show = false;
            // Show the building and initialize the level bar
            if (typeof buildingIndoor.show === "function") {
              buildingIndoor.show();
            }
            if (typeof buildingIndoor.initLevelBar === "function") {
              buildingIndoor.initLevelBar();
            }
            // Set this as the last active building
            lastActiveVenueId = venueId;
            console.log("Building data for venue", venueId, buildingData);
          } else {
            console.error(
              "Failed to fetch building data:",
              response.status,
              response.statusText
            );
          }
        } catch (err) {
          console.error("Error fetching building data:", err);
        }
      } else {
        // For any non-venue feature, update the level bar and context
        handleIndoorFeatureClick(picked.id);
      }
    } catch (error) {
      console.log("Error handling click interaction:", error);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Main application entry point
 */
(async function () {
  try {
    // Reminder: API_BASE_URL is set to http://localhost:3001 for debug, "" for Docker/production
    console.log(`API_BASE_URL for backend API calls: '${API_BASE_URL}'`);

    // Test backend/frontend connection
    try {
      const testDbResponse = await fetch(`${API_BASE_URL}/api/test/test-db`);
      if (testDbResponse.ok) {
        const testDbResult = await testDbResponse.json();
        console.log("Backend /api/test/test-db result:", testDbResult);
      } else {
        console.warn(
          "/api/test/test-db failed:",
          testDbResponse.status,
          testDbResponse.statusText
        );
      }
    } catch (err) {
      console.error("Error calling /api/test/test-db:", err);
    }

    // Initialize the demo
    await initDemo();

    // Set up global references
    window.viewer = viewer;
    viewer.scene.debugShowFramesPerSecond = true;

    // Export classes globally for debugging/console access

    // Export venue management functions
    // window.clearAllVenues = clearAllVenues;
    // window.getVenueStatus = getVenueStatus;
    // window.activeVenues = activeVenues;
    // window.activeMTRStations = activeMTRStations;

    // Export Z-clipping manager
    window.ZClippingManager = ZClippingManager;

    // Export 3D Tiles clipping manager
    // window.TilesClippingManager = TilesClippingManager;

    console.log("3D Indoor Map Viewer Demo loaded successfully");
    console.log(
      "Click on any blue venue polygon or red MTR polygon to explore indoor mapping!"
    );
    console.log(
      "Multiple venues can be loaded simultaneously. Use clearAllVenues() to reset."
    );
    console.log("Use getVenueStatus() to see currently loaded venues.");
    console.log(
      "Use the Z-Value Clipping slider to explore different building levels!"
    );
    console.log(
      "Use the 3D Tiles clipping sliders to clip indoor and MTR network tilesets!"
    );
  } catch (error) {
    console.error("Error initializing demo:", error);
  }
})();
