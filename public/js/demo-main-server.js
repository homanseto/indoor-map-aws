import { initializeCesiumViewer } from "./cesium-config.js";
import { BuildingIndoor } from "./modules/building-indoor.js";
import { IndoorNetwork } from "./modules/indoor-network.js";
import { ZClippingManager } from "./utils/zClippingManager.js";

// Global variables for demo management
let viewer;
let threeDTiles, PNTiles, indoorMTRTiles, indoorNetworkTiles, hikingTiles;

let activeMTRStations = new Map(); // Map<venueId, MTRIndoor>
let hiddenVenuePolygons = new Set(); // Track hidden venue polygons
let hiddenMTRPolygons = new Set(); // Track hidden MTR polygons

// Map to manage active buildings (venueId -> BuildingIndoor)
let activeBuildings = new Map();
let activeNetworks = new Map();

// Coordination flag to prevent timing conflicts between event handlers
let isProcessingClick = false;

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
  if (
    !venueId ||
    !activeBuildings.has(venueId) ||
    (activeNetworks.size > 0 && !activeNetworks.has(venueId))
  )
    return;

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

  // Reset network visibility to shown and update toggle button
  if (activeNetworks.has(venueId)) {
    const network = activeNetworks.get(venueId);
    if (typeof network.showNetwork === "function") {
      network.showNetwork(); // Auto-reset to visible
    }
    if (typeof network.initNetworkToggle === "function") {
      network.initNetworkToggle(); // Reinitialize toggle button
    }
  }

  lastActiveVenueId = venueId;
}
let lastActiveVenueId = null; // Track last active building for level bar reset

// Building Network Management
let activeBuildingNetworks = new Map(); // Map<venueId, {dataSource, data, loading}>
let buildingNetworkCache = new Map(); // Map<buildingName, networkData>

// Configurable API base URL for backend
// Use http://localhost:3002 for local debug, "" for production/Docker
const API_BASE_URL =
  window.location.port === "3002" ? "http://localhost:3002" : "";

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

  // Setup wall selection override to prevent wall info boxes
  setupWallSelectionOverride();

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
        activeNetworks,
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

function setupWallSelectionOverride() {
  // Override Cesium's default selection behavior to show info for underlying features when clicking walls
  viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(function (event) {
    // Prevent processing if already being handled
    if (isProcessingClick) return;

    const pickedFeatures = viewer.scene.drillPick(event.position);

    if (pickedFeatures.length === 0) {
      viewer.selectedEntity = undefined;
      return;
    }

    // Find the first non-wall feature to display its information
    for (let pickedFeature of pickedFeatures) {
      if (pickedFeature && pickedFeature.id && pickedFeature.id.properties) {
        const featureType =
          pickedFeature.id.properties.feature_type?.getValue?.() ||
          pickedFeature.id.properties.feature_type;

        if (!featureType || featureType === "wall") {
          continue; // Skip walls and undefined features
        }

        // Found a valid non-wall feature - set it as selected to show its info box
        viewer.selectedEntity = pickedFeature.id;
        console.log(
          `[setupWallSelectionOverride] Selected underlying feature: ${featureType} (${pickedFeature.id.id})`
        );

        // Set flag to let custom handler know selection is already handled
        window.lastSelectedByOverride = pickedFeature.id;
        return;
      }
    }

    // If only walls or invalid features found, clear selection
    viewer.selectedEntity = undefined;
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  console.log(
    "[setupWallSelectionOverride] Wall click-through selection installed - underlying features will show info boxes"
  );
}

function setupVenueClickInteraction() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(async (movement) => {
    try {
      // Set processing flag to coordinate with override handler
      isProcessingClick = true;

      const picked = viewer.scene.pick(movement.position);
      const pickedFeatures = viewer.scene.drillPick(movement.position);
      if (pickedFeatures.length === 0) {
        // Clear selections for all buildings when clicking empty space
        activeBuildings.forEach((building) => {
          if (typeof building.clearSelection === "function") {
            building.clearSelection();
          }
        });
        return;
      }
      const featureTypeList = pickedFeatures.map(
        (f) => f.id.properties.feature_type
      );
      console.log(featureTypeList);
      for (let pf of pickedFeatures) {
        if (
          Cesium.defined(pf) &&
          pf.id &&
          pf.id.properties &&
          pf.id.properties.feature_type
        ) {
          const venueId = pf.id.id;
          const properties = pf.id.properties;
          const featureType =
            properties && properties.feature_type
              ? properties.feature_type.getValue
                ? properties.feature_type.getValue(Cesium.JulianDate.now())
                : properties.feature_type
              : undefined;
          console.log(featureType);
          if (!featureType || featureType === "wall") {
            continue; // Skip this feature and check the next one
          } else {
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
                  if (
                    typeof prevBuilding.resetLevelBarAndShowAll === "function"
                  ) {
                    prevBuilding.resetLevelBarAndShowAll();
                  }
                }
                const buildingIndoor = activeBuildings.get(venueId);
                if (typeof buildingIndoor.initLevelBar === "function") {
                  buildingIndoor.initLevelBar();
                }

                // Reset network visibility to shown and update toggle button
                if (activeNetworks.has(venueId)) {
                  const network = activeNetworks.get(venueId);
                  if (typeof network.showNetwork === "function") {
                    network.showNetwork(); // Auto-reset to visible
                  }
                  if (typeof network.initNetworkToggle === "function") {
                    network.initNetworkToggle(); // Reinitialize toggle button
                  }
                }

                lastActiveVenueId = venueId;
                return;
              }
              // Reset previous building's level bar and filtering to ALL
              if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
                const prevBuilding = activeBuildings.get(lastActiveVenueId);
                if (
                  typeof prevBuilding.resetLevelBarAndShowAll === "function"
                ) {
                  prevBuilding.resetLevelBarAndShowAll();
                }
              }
              try {
                const buildingResponse = await fetch(
                  `${API_BASE_URL}/api/smo3dm/building_data?venue_id=${encodeURIComponent(
                    venueId
                  )}`,
                  {
                    credentials: "same-origin",
                  }
                );
                const networkResponse = await fetch(
                  `${API_BASE_URL}/api/network/network_data?venue_id=${encodeURIComponent(
                    venueId
                  )}`,
                  {
                    credentials: "same-origin",
                  }
                );
                if (networkResponse.ok) {
                  const networkData = await networkResponse.json();
                  const indoorNetwork = new IndoorNetwork(viewer, networkData);
                  activeNetworks.set(venueId, indoorNetwork);
                  console.log(networkData);
                  if (typeof indoorNetwork.show === "function") {
                    indoorNetwork.show();
                  }
                  // Initialize network toggle button (positioned below level selection bar)
                  if (typeof indoorNetwork.initNetworkToggle === "function") {
                    indoorNetwork.initNetworkToggle();
                  }
                } else {
                  console.error(
                    "Failed to fetch network data:",
                    networkResponse.status,
                    networkResponse.statusText
                  );
                }
                if (buildingResponse.ok) {
                  const buildingData = await buildingResponse.json();
                  // Instantiate BuildingIndoor and add to activeBuildings
                  const buildingIndoor = new BuildingIndoor(
                    viewer,
                    buildingData
                  );
                  activeBuildings.set(venueId, buildingIndoor);
                  // Hide the venue entity
                  pf.id.show = false;
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
                    buildingResponse.status,
                    buildingResponse.statusText
                  );
                }
                return;
              } catch (err) {
                console.error("Error fetching building data:", err);
                return;
              }
            } else {
              // For any non-venue feature, update the level bar and context, and highlight the feature
              handleIndoorFeatureClick(pf.id);

              // Highlight the selected feature
              const entityVenueId =
                pf.id.properties && pf.id.properties.venue_id
                  ? pf.id.properties.venue_id.getValue
                    ? pf.id.properties.venue_id.getValue()
                    : pf.id.properties.venue_id
                  : null;

              if (entityVenueId && activeBuildings.has(entityVenueId)) {
                const building = activeBuildings.get(entityVenueId);
                if (typeof building.highlightFeature === "function") {
                  building.highlightFeature(pf.id);
                }
              }
              return;
            }
          }
        }
      }
    } catch (error) {
      console.log("Error handling click interaction:", error);
    } finally {
      // Always reset processing flag
      isProcessingClick = false;
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Main application entry point
 */
(async function () {
  try {
    // Reminder: API_BASE_URL is set to http://localhost:3002 for debug, "" for Docker/production
    console.log(`API_BASE_URL for backend API calls: '${API_BASE_URL}'`);

    // Initialize the demo
    await initDemo();

    // Set up global references
    window.viewer = viewer;
    viewer.scene.debugShowFramesPerSecond = true;

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
