import { initializeCesiumViewer } from "./cesium-config.js";
import { BuildingIndoor } from "./modules/building-indoor.js";
import { IndoorNetwork } from "./modules/indoor-network.js";
import { ZClippingManager } from "./utils/zClippingManager.js";
import { initSidebar } from "./ui/sidebar.js";

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

// Global variable to store venue data for search functionality
let globalVenueGeoJson = null;

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

  // Store venue data globally for search functionality
  globalVenueGeoJson = venueGeoJson;

  await setupVenueDataSources(venueGeoJson);

  // Initialize search box
  initBuildingSearchBox();

  // Initialize sidebar
  initSidebar(viewer);

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

// Initialize building search box functionality
function initBuildingSearchBox() {
  // Create floating search container
  const searchContainer = document.createElement("div");
  searchContainer.id = "buildingSearchContainer";
  searchContainer.className = "building-search-container";

  // Create search input
  const searchInput = document.createElement("input");
  searchInput.id = "buildingSearchInput";
  searchInput.type = "text";
  searchInput.placeholder = "Search buildings...";
  searchInput.className = "building-search-input";

  // Create dropdown container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.id = "buildingSearchDropdown";
  dropdownContainer.className = "search-dropdown";
  dropdownContainer.style.display = "none";

  // Assemble the search box
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(dropdownContainer);

  // Add to body as floating overlay
  document.body.appendChild(searchContainer);

  // Set up event listeners
  setupSearchEventListeners(searchInput, dropdownContainer);
}

// Set up search box event listeners
function setupSearchEventListeners(searchInput, dropdownContainer) {
  let allBuildings = [];

  // Extract building data from venue GeoJSON
  if (globalVenueGeoJson && globalVenueGeoJson.features) {
    allBuildings = globalVenueGeoJson.features
      .filter(
        (feature) => feature.properties && feature.properties.buildingName
      )
      .map((feature) => ({
        name: feature.properties.buildingName,
        venueId: feature.id,
        feature: feature,
      }));
  }

  // Show dropdown on focus
  searchInput.addEventListener("focus", () => {
    showSearchDropdown(dropdownContainer, allBuildings, "");
  });

  // Filter on input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    showSearchDropdown(dropdownContainer, allBuildings, query);
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !searchInput.contains(e.target) &&
      !dropdownContainer.contains(e.target)
    ) {
      dropdownContainer.style.display = "none";
    }
  });

  // Handle enter key
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const visibleItems = dropdownContainer.querySelectorAll(
        ".search-dropdown-item:not([style*='display: none'])"
      );
      if (visibleItems.length > 0) {
        // Select first visible item
        const firstItem = visibleItems[0];
        const venueId = firstItem.dataset.venueId;
        selectBuilding(venueId, searchInput, dropdownContainer);
      }
    }
  });
}

// Show search dropdown with filtered results
function showSearchDropdown(dropdownContainer, buildings, query) {
  if (!dropdownContainer) return;

  dropdownContainer.innerHTML = "";

  const filteredBuildings = buildings.filter((building) => {
    if (!query) return true;
    return building.name.toLowerCase().includes(query.toLowerCase());
  });

  if (filteredBuildings.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "search-dropdown-item no-results";
    noResults.textContent = "No buildings found";
    dropdownContainer.appendChild(noResults);
  } else {
    filteredBuildings.forEach((building) => {
      const item = document.createElement("div");
      item.className = "search-dropdown-item";
      item.dataset.venueId = building.venueId;
      item.textContent = building.name;

      // Click handler
      item.addEventListener("click", () => {
        selectBuilding(
          building.venueId,
          document.getElementById("buildingSearchInput"),
          dropdownContainer
        );
      });

      dropdownContainer.appendChild(item);
    });
  }

  dropdownContainer.style.display = "block";
}

// Handle building selection
async function selectBuilding(venueId, searchInput, dropdownContainer) {
  try {
    // Hide dropdown and clear input
    dropdownContainer.style.display = "none";

    // Find the selected building name and set it in input
    const selectedBuilding = globalVenueGeoJson.features.find(
      (f) => f.id === venueId
    );
    if (selectedBuilding) {
      searchInput.value = selectedBuilding.properties.buildingName;
    }

    console.log(`Selected building: ${venueId}`);

    // Check if building is already loaded (Smart Loading - Option B)
    if (activeBuildings.has(venueId)) {
      console.log("Building already loaded, resetting view...");

      // Reset previous building's level bar if switching to a different building
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

      // Reset to ALL levels and re-center view
      const building = activeBuildings.get(venueId);
      if (typeof building.resetLevelBarAndShowAll === "function") {
        building.resetLevelBarAndShowAll();
      }

      // Reset network visibility
      if (activeNetworks.has(venueId)) {
        const network = activeNetworks.get(venueId);
        if (typeof network.showNetwork === "function") {
          network.showNetwork();
        }
        if (typeof network.initNetworkToggle === "function") {
          network.initNetworkToggle();
        }
      }

      // Initialize level bar for the selected building
      if (typeof building.initLevelBar === "function") {
        building.initLevelBar();
      }

      // Fly to building - try venue entity first, then building units
      const venueDataSources = viewer.dataSources._dataSources.filter(
        (ds) => ds.name === "venue_polygon"
      );
      let flownToBuilding = false;

      if (venueDataSources.length > 0) {
        const venueEntity = venueDataSources[0].entities.getById(venueId);
        if (venueEntity && venueEntity.show) {
          // Venue is visible, fly to it
          await viewer.flyTo(venueEntity, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
          });
          flownToBuilding = true;
        }
      }

      // If venue entity is hidden, fly to building's units instead
      if (
        !flownToBuilding &&
        building.dataSources &&
        building.dataSources.units
      ) {
        const unitsDataSource = building.dataSources.units;
        if (unitsDataSource.entities.values.length > 0) {
          await viewer.flyTo(unitsDataSource.entities.values, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
          });
          flownToBuilding = true;
        }
      }

      // Final fallback: try any available building entities
      if (!flownToBuilding && building.dataSources) {
        const availableDataSources = Object.values(building.dataSources).filter(
          (ds) => ds.entities.values.length > 0
        );
        if (availableDataSources.length > 0) {
          await viewer.flyTo(availableDataSources[0].entities.values, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
          });
        }
      }

      lastActiveVenueId = venueId;
      return;
    }

    // Reset previous building's level bar to ALL
    if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
      const prevBuilding = activeBuildings.get(lastActiveVenueId);
      if (typeof prevBuilding.resetLevelBarAndShowAll === "function") {
        prevBuilding.resetLevelBarAndShowAll();
      }
    }

    // Load building data (similar to venue click behavior)
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

    // Load network data if available
    if (networkResponse.ok) {
      const networkData = await networkResponse.json();
      const indoorNetwork = new IndoorNetwork(viewer, networkData);
      activeNetworks.set(venueId, indoorNetwork);

      if (typeof indoorNetwork.show === "function") {
        indoorNetwork.show();
      }
      if (typeof indoorNetwork.initNetworkToggle === "function") {
        indoorNetwork.initNetworkToggle();
      }
    }

    // Load building data
    if (buildingResponse.ok) {
      const buildingData = await buildingResponse.json();
      const buildingIndoor = new BuildingIndoor(viewer, buildingData);
      activeBuildings.set(venueId, buildingIndoor);

      // Find the venue entity first and fly to it before hiding
      const venueDataSources = viewer.dataSources._dataSources.filter(
        (ds) => ds.name === "venue_polygon"
      );
      let venueEntity = null;
      if (venueDataSources.length > 0) {
        venueEntity = venueDataSources[0].entities.getById(venueId);
        if (venueEntity) {
          // Fly to the venue location first with custom duration
          await viewer.flyTo(venueEntity, {
            duration: 2.0,
            offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
          });
          // Then hide the venue entity
          venueEntity.show = false;
        }
      }

      // Show building and initialize level bar
      if (typeof buildingIndoor.show === "function") {
        await buildingIndoor.show();
      }
      if (typeof buildingIndoor.initLevelBar === "function") {
        buildingIndoor.initLevelBar();
      }

      // If we couldn't find the venue entity, try to fly to the building's first unit or feature
      if (
        !venueEntity &&
        buildingData.units &&
        buildingData.units.features.length > 0
      ) {
        const firstUnit = buildingData.units.features[0];
        if (firstUnit.geometry && firstUnit.geometry.coordinates) {
          const coords = firstUnit.geometry.coordinates[0][0]; // Get first coordinate
          const position = Cesium.Cartesian3.fromDegrees(
            coords[0],
            coords[1],
            100
          );
          viewer.camera.flyTo({
            destination: position,
            duration: 2.0,
          });
        }
      }

      lastActiveVenueId = venueId;
      console.log(
        `Building loaded and displayed: ${selectedBuilding.properties.buildingName}`
      );
    } else {
      console.error("Failed to fetch building data:", buildingResponse.status);
    }
  } catch (error) {
    console.error("Error selecting building:", error);
  }
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
