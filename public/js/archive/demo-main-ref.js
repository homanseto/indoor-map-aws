/**
 * Demo Main Application - 3D Indoor Map Viewer
 *
 * This file contains the main application logic for the 3D Indoor Map Viewer demo.
 * It handles initialization of the Cesium viewer, loading of 3D tiles, venue data,
 * and coordination between different indoor visualization modules.
 *
 * Features:
 * - Cesium viewer initialization with Hong Kong-specific configuration
 * - 3D tileset loading (buildings, indoor networks, hiking routes)
 * - Venue and MTR station data loading and display
 * - Interactive controls for 3D tiles and indoor venues
 * - Demo coordination between VenueIndoor and MTRIndoor modules
 *
 * @module DemoMain
 * @version 1.0.0
 * @author Generated from demo.html
 */

import { initializeCesiumViewer } from "../cesium-config.js";
import { VenueIndoor } from "./venue-indoor.js";
import { MTRIndoor } from "./mtr-indoor.js";
// import { OpacityControl } from "../utils/zClippingManager.js";

// Global variables for demo management
let viewer;
let threeDTiles, PNTiles, indoorMTRTiles, indoorNetworkTiles, hikingTiles;
let activeVenues = new Map(); // Map<venueId, VenueIndoor>
let activeMTRStations = new Map(); // Map<venueId, MTRIndoor>
let hiddenVenuePolygons = new Set(); // Track hidden venue polygons
let hiddenMTRPolygons = new Set(); // Track hidden MTR polygons

// Building Network Management
let activeBuildingNetworks = new Map(); // Map<venueId, {dataSource, data, loading}>
let buildingNetworkCache = new Map(); // Map<buildingName, networkData>

// Demo venue IDs
const TKOGOVENUEID = `e82ec75f-5b51-48a6-bfe0-c4f039e58420`;
const TKOGOMTRID = `bbcde31e-3b2d-46e5-9eca-dbc2ce387162`;

// Configurable API base URL for backend
// Use http://localhost:3001 for local debug, "" for production/Docker
const API_BASE_URL =
  window.location.port === "3001" ? "http://localhost:3001" : "";

// API endpoints
const venuePolygonApi =
  "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/venue_polygon";
const MTRvenuePolygonApi =
  "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_venue_polygon";

/**
 * Initializes the demo application
 *
 * This function performs the complete initialization sequence:
 * 1. Sets up the Cesium viewer with Hong Kong configuration
 * 2. Loads venue polygon data for both regular and MTR venues
 * 3. Loads and configures 3D tilesets
 * 4. Creates interactive controls
 * 5. Loads Tsing Yi Station from local data by default
 *
 * @async
 * @returns {Promise<void>}
 */
async function initDemo() {
  // Initialize Cesium viewer
  viewer = initializeCesiumViewer("cesiumContainer");

  // Load venue polygon data
  const queryUrl = encodeURI(
    `${venuePolygonApi}?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&count=5000`
  );
  const venueResponse = await fetch(queryUrl);
  const venueResponseFromServer = await fetch(
    `${API_BASE_URL}/api/smo3dm/venues`,
    {
      credentials: "same-origin",
    }
  );
  const venueData = await venueResponseFromServer.json();
  const venueGeoJson = await venueResponse.json();
  // console.log(venueGeoJson);
  // Load MTR venue polygon data
  const MTRqueryUrl = encodeURI(
    `${MTRvenuePolygonApi}?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&count=5000`
  );
  const MTRvenueResponse = await fetch(MTRqueryUrl);
  const MTRvenueGeoJson = await MTRvenueResponse.json();

  // Create and configure venue data sources
  await setupVenueDataSources(venueGeoJson, MTRvenueGeoJson);

  // Load and configure 3D tilesets
  // await setup3DTilesets();

  // Create interactive control panel
  createControlPanel();

  // Set up click interaction for venues
  setupVenueClickInteraction();

  // Initialize Z-clipping manager
  ZClippingManager.init();

  // Initialize 3D Tiles clipping manager
  TilesClippingManager.init();

  // Load Tsing Yi Station from local data by default
  await loadLocalTsingYiStation();
}

/**
 * Sets up venue data sources with 3D styling
 *
 * @param {Object} venueGeoJson - Regular venue GeoJSON data
 * @param {Object} MTRvenueGeoJson - MTR venue GeoJSON data
 * @async
 * @returns {Promise<void>}
 */
async function setupVenueDataSources(venueGeoJson, MTRvenueGeoJson) {
  // Create regular venue data source
  const venueDataSource = new Cesium.GeoJsonDataSource("venue_polygon");
  await venueDataSource.load(venueGeoJson, {
    stroke: new Cesium.Color(0.26, 0.52, 0.96, 0.5),
    fill: new Cesium.Color(0.26, 0.52, 0.96, 0.5),
    outline: false,
  });

  // Apply 3D properties to venue entities
  Object.values(venueDataSource.entities.values).forEach((entity) => {
    entity.name = entity.properties.venue_name_en;
    entity.polygon.arcType = Cesium.ArcType.GEODESIC;
    entity.polygon.perPositionHeight = false;
    entity.polygon.extrudedHeight = entity.properties.venue_display_height;
    entity.polygon.height = entity.properties.venue_display_height_min;
    entity.polygon.closeTop = false;
  });
  viewer.dataSources.add(venueDataSource);

  // Create MTR venue data source
  const MTRvenueDataSource = new Cesium.GeoJsonDataSource("mtr_venue_polygon");
  await MTRvenueDataSource.load(MTRvenueGeoJson, {
    stroke: new Cesium.Color(0.65, 0.18, 0.26, 0.5),
    fill: new Cesium.Color(0.65, 0.18, 0.26, 0.5),
    outline: false,
  });

  // Apply 3D properties to MTR venue entities
  Object.values(MTRvenueDataSource.entities.values).forEach((entity) => {
    entity.name = entity.properties.venue_name_en;
    entity.polygon.arcType = Cesium.ArcType.GEODESIC;
    entity.polygon.perPositionHeight = false;
    entity.polygon.extrudedHeight = entity.properties.venue_display_height;
    entity.polygon.height = entity.properties.venue_display_height_min;
    entity.polygon.closeTop = false;
  });
  viewer.dataSources.add(MTRvenueDataSource);
}

/**
 * Sets up 3D tilesets for buildings, indoor networks, and hiking routes
 *
 * @async
 * @returns {Promise<void>}
 */
async function setup3DTilesets() {
  // Load main building tileset
  threeDTiles = await Cesium.Cesium3DTileset.fromUrl(
    "https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json?key=3967f8f365694e0798af3e7678509421"
  );
  threeDTiles.style = new Cesium.Cesium3DTileStyle({
    color: {
      evaluateColor: function (feature, result) {
        return Cesium.Color.clone(Cesium.Color.WHITE.withAlpha(0.4), result);
      },
    },
  });

  // Set height clipping for buildings
  viewer.scene.primitives.add(threeDTiles);

  // Load 3D Pedestrian Network
  PNTiles = await Cesium.Cesium3DTileset.fromUrl(
    "http://3dm/dev/bR5B7mxkmjhRhTTroMCo/storage/3dpn/3DPN_v1.0/tileset.json"
  );
  PNTiles.style = new Cesium.Cesium3DTileStyle({
    show: true,
    color: "color('orange')",
  });
  viewer.scene.primitives.add(PNTiles);

  // Load indoor MTR network
  indoorMTRTiles = await Cesium.Cesium3DTileset.fromUrl(
    "http://3dmapweb3:8097/b3dm/indoor_network_mtr_3/output/tileset.json"
  );
  indoorMTRTiles.style = new Cesium.Cesium3DTileStyle({
    color: "color('black')",
  });
  viewer.scene.primitives.add(indoorMTRTiles);

  // Load indoor network
  // indoorNetworkTiles = await Cesium.Cesium3DTileset.fromUrl(
  //   "http://3dmapweb3:8097/b3dm/indoor_network/output/tileset.json"
  // );
  // await indoorNetworkTiles.readyPromise;

  // // Configure indoor network clipping
  // const boundingVolume = indoorNetworkTiles.root.boundingVolume;
  // const minHeight = boundingVolume.minimumHeight;
  // const maxHeight = boundingVolume.maximumHeight;
  // const clipPercentage = 0.5;
  // const clipHeight = minHeight + (maxHeight - minHeight) * clipPercentage;

  // indoorNetworkTiles.style = new Cesium.Cesium3DTileStyle({
  //   color: {
  //     evaluateColor: function (feature, result) {
  //       return Cesium.Color.fromBytes(0, 0, 255, 255, result);
  //     },
  //   },
  // });
  // viewer.scene.primitives.add(indoorNetworkTiles);

  // Load hiking routes
  hikingTiles = await Cesium.Cesium3DTileset.fromUrl(
    "http://3dmapweb3:8097/b3dm/hiking_route_2/output/tileset.json"
  );
  hikingTiles.style = new Cesium.Cesium3DTileStyle({
    color: {
      evaluateColor: function (feature, result) {
        return Cesium.Color.fromBytes(255, 0, 255, 255, result);
      },
    },
  });
  hikingTiles.enableCollision = false;
  viewer.scene.primitives.add(hikingTiles);
  viewer.scene.primitives.raiseToTop(hikingTiles);

  // Store references globally for control panel
  window.threeDTiles = threeDTiles;
  window.PNTiles = PNTiles;
  window.indoorMTRTiles = indoorMTRTiles;
  // window.indoorNetworkTiles = indoorNetworkTiles;
  window.hikingTiles = hikingTiles;
}

/**
 * Creates the interactive control panel using jsPanel
 */
function createControlPanel() {
  jsPanel.create({
    theme: "dark",
    headerTitle: "Control",
    panelSize: {
      width: () => {
        return Math.min(300, window.innerWidth * 0.9);
      },
      height: () => {
        return Math.min(350, window.innerHeight * 0.6);
      },
    },
    animateIn: "jsPanelFadeIn",
    onwindowresize: true,
    position: "left-bottom",
    content: `
      <label>3D Tiles Opacity</label>
      <br>
      <input id="F2Opac" type="range" min="0.4" max="1" value="0.4" step="0.1">
      <form>
        <p>3DPN Theme:</p>
        <div>
          <input type="radio" id="none" name="theme" value="none" checked>
          <label for="none">none</label>
        </div>
        <div>
          <input type="radio" id="weatherproof" name="theme" value="weatherproof">
          <label for="weatherproof">Weather Proof</label>
        </div>
        <div>
          <input type="radio" id="wheelchairbarrier" name="theme" value="wheelchairbarrier">
          <label for="wheelchairbarrier">Wheelchair Barrier</label>
        </div>
        <div>
          <input type="radio" id="wheelchairaccess" name="theme" value="wheelchairaccess">
          <label for="wheelchairaccess">Wheelchair Access</label>
        </div>
        <div>
          <input type="radio" id="crossingfeature" name="theme" value="crossingfeature">
          <label for="crossingfeature">Crossing Feature</label>
        </div>
      </form>
      <br>
      <label>Legend</label>
      <div id="legend" />`,
    callback: function (panel) {
      setupControlPanelEvents();
    },
  });
}

/**
 * Sets up event handlers for the control panel
 */
function setupControlPanelEvents() {
  // Opacity control
  document.getElementById("F2Opac").addEventListener("change", (evt) => {
    threeDTiles.style = new Cesium.Cesium3DTileStyle({
      color: {
        evaluateColor: function (feature, result) {
          return Cesium.Color.clone(
            Cesium.Color.WHITE.withAlpha(
              parseFloat(document.getElementById("F2Opac").value)
            ),
            result
          );
        },
      },
    });
  });

  // Theme selection
  const radioButtons = document.querySelectorAll(
    'input[type="radio"][name="theme"]'
  );
  const legenddiv = document.getElementById("legend");

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      if (event.target.checked) {
        updateTheme(event.target.value, legenddiv);
      }
    });
  });
}

/**
 * Updates the 3DPN theme based on selection
 *
 * @param {string} theme - The selected theme
 * @param {HTMLElement} legendDiv - The legend container element
 */
function updateTheme(theme, legendDiv) {
  if (theme === "none") {
    PNTiles.style = new Cesium.Cesium3DTileStyle({
      show: true,
      color: "color('orange')",
    });
    legendDiv.innerHTML = "";
  } else {
    PNTiles.style = new Cesium.Cesium3DTileStyle({
      show: true,
      color: {
        conditions: [
          [`Number(\${${theme}}) === 1`, "color('red')"],
          [`Number(\${${theme}}) === 2`, "color('green')"],
          [`Number(\${${theme}}) === 3`, "color('blue')"],
          [`Number(\${${theme}}) === 4`, "color('purple')"],
          [`Number(\${${theme}}) === 5`, "color('yellow')"],
          [`\${${theme}} === null`, "color('black')"],
        ],
      },
    });

    // Update legend based on theme
    const legends = {
      weatherproof: `
        <span style='font-size:20px; color:red !important;'>&#9679;</span> Indoor <br/>
        <span style='font-size:20px; color:green !important;'>&#9679;</span> Outdoor`,
      wheelchairbarrier: `
        <span style='font-size:20px; color:red !important;'>&#9679;</span> True <br/>
        <span style='font-size:20px; color:green !important;'>&#9679;</span> False`,
      wheelchairaccess: `
        <span style='font-size:20px; color:red !important;'>&#9679;</span> True <br/>
        <span style='font-size:20px; color:green !important;'>&#9679;</span> False`,
      crossingfeature: `
        <span style='font-size:20px; color:red !important;'>&#9679;</span> Road <br/>
        <span style='font-size:20px; color:green !important;'>&#9679;</span> Tramway <br/>
        <span style='font-size:20px; color:white !important;'>&#9679;</span> Light Rail <br/>
        <span style='font-size:20px; color:purple !important;'>&#9679;</span> BicycleTrack <br/>
        <span style='font-size:20px; color:yellow !important;'>&#9679;</span> Public Transport Interchange <br/>
        <span style='font-size:20px; color:brown !important;'>&#9679;</span> Null <br/>`,
    };

    legendDiv.innerHTML = legends[theme] || "";
  }
}

/**
 * Loads Tsing Yi Station from local data files
 * This is the default demo content that loads automatically
 *
 * @async
 * @returns {Promise<void>}
 */
async function loadLocalTsingYiStation() {
  try {
    // Define local data paths for Tsing Yi Station
    const localPaths = {
      mtr_venue_polygon: "./data/Tsing Yi Station/mtr_venue.geojson",
      mtr_level_polygon: "./data/Tsing Yi Station/mtr_level.geojson",
      mtr_unit_polygon: "./data/Tsing Yi Station/mtr_unit.geojson",
      mtr_opening_line: "./data/Tsing Yi Station/mtr_opening.geojson",
      mtr_amenity_point: "./data/Tsing Yi Station/mtr_amenity_1.geojson",
      mtr_occupant_point: "./data/Tsing Yi Station/mtr_occupant.geojson",
    };

    // Create MTRIndoor instance with local data
    const TsingYiStation = new MTRIndoor(
      viewer,
      "tsing-yi-station",
      localPaths
    );

    // Initialize and display the station
    await TsingYiStation.init();
    await TsingYiStation.showAllFloor();

    // Set up floor controls in the toolbar
    TsingYiStation.initVenueOption("#venueOption");

    // Fly to the station
    await TsingYiStation.flyTo();

    // Store reference for potential cleanup
    window.currentTsingYiStation = TsingYiStation;
    activeMTRStations.set("tsing-yi-station", TsingYiStation);

    // Apply current Z-clipping to Tsing Yi Station
    ZClippingManager.applyToNewVenue(TsingYiStation);

    console.log("Tsing Yi Station loaded successfully from local data");
  } catch (error) {
    console.error("Error loading Tsing Yi Station:", error);
  }
}

/**
 * Sets up click interaction for venue and MTR polygons
 *
 * This function adds event handlers to detect clicks on venue/MTR entities
 * and automatically loads the appropriate indoor visualization.
 */
function setupVenueClickInteraction() {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  handler.setInputAction(async (movement) => {
    try {
      const picked = viewer.scene.pick(movement.position);

      if (!Cesium.defined(picked)) {
        return;
      }

      const selectFeature = picked.id;
      if (!selectFeature || !selectFeature.id) {
        return;
      }

      // Determine the type of feature clicked
      const selectType = selectFeature.id.startsWith("mtr")
        ? selectFeature.id.split(".")[0]
        : selectFeature.id
            .split("_")
            .slice(0, 2)
            .map((e) => e.split(".")[0])
            .join("_");

      console.log("Feature clicked:", selectType);

      switch (selectType) {
        case "venue_polygon":
          await handleVenueClickWithClipping(selectFeature);
          break;
        case "mtr_venue_polygon":
          await handleMTRVenueClickWithClipping(selectFeature);
          break;
        case "unit_outline":
        case "opening_line":
        case "amenity_point":
        case "occupant_point":
          handleIndoorFeatureClick(selectFeature);
          break;
        case "mtr_unit_polygon":
        case "mtr_opening_line":
        case "mtr_amenity_point":
        case "mtr_occupant_point":
          handleMTRIndoorFeatureClick(selectFeature);
          break;
        default:
          console.log("Unknown feature type:", selectType);
          break;
      }
    } catch (ex) {
      console.log("Error handling click interaction:", ex);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

/**
 * Handles clicks on regular venue polygons (modified for multiple venues)
 *
 * @param {Cesium.Entity} selectFeature - The clicked venue entity
 */
async function handleVenueClick(selectFeature) {
  const venueId = selectFeature.properties["venue_id"]._value;
  const venueEngName = selectFeature.properties["venue_eng_name"]._value;
  console.log(`Venue clicked: ${venueId} (${venueEngName})`);

  // Check if this venue is already loaded
  if (activeVenues.has(venueId)) {
    console.log(`Venue ${venueId} is already loaded`);
    return;
  }

  try {
    // Show loading state (you can enhance this with visual feedback)
    console.log(
      `🔄 Loading venue "${venueEngName}" and its building network...`
    );

    // Create and initialize new VenueIndoor without destroying existing ones
    const venueIndoor = new VenueIndoor(viewer, venueId);
    await venueIndoor.init();
    venueIndoor.initVenueOption("#venueOption");
    await venueIndoor.flyTo();
    await venueIndoor.showAllFloor();

    // Store the venue instance and hide its polygon
    activeVenues.set(venueId, venueIndoor);
    hiddenVenuePolygons.add(venueId);
    selectFeature.show = false;

    // Load building network for this venue
    const networkSuccess = await loadBuildingNetworkForVenue(
      venueId,
      venueEngName
    );
    if (networkSuccess) {
      console.log(`✅ Building network loaded for venue "${venueEngName}"`);
    } else {
      console.warn(
        `⚠️ Could not load building network for venue "${venueEngName}"`
      );
    }

    console.log(
      `Venue ${venueId} loaded successfully. Total active venues: ${activeVenues.size}`
    );
  } catch (error) {
    console.error(`Error loading venue ${venueId}:`, error);
    // Clean up on error
    activeBuildingNetworks.delete(venueId);
  }
}

/**
 * Handles clicks on MTR venue polygons (modified for multiple stations)
 *
 * @param {Cesium.Entity} selectFeature - The clicked MTR venue entity
 */
async function handleMTRVenueClick(selectFeature) {
  const venueId = selectFeature.properties["venue_id"]._value;
  const venueEngName = selectFeature.properties["venue_eng_name"]._value;
  console.log(`MTR venue clicked: ${venueId} (${venueEngName})`);

  // Check if this MTR station is already loaded
  if (activeMTRStations.has(venueId)) {
    console.log(`MTR station ${venueId} is already loaded`);
    return;
  }

  try {
    // Show loading state
    console.log(
      `🔄 Loading MTR station "${venueEngName}" and its building network...`
    );

    // Create and initialize new MTRIndoor without destroying existing ones
    const mtrIndoor = new MTRIndoor(viewer, venueId);
    await mtrIndoor.init();
    mtrIndoor.initVenueOption("#venueOption");
    await mtrIndoor.flyTo();
    await mtrIndoor.showAllFloor();

    // Store the MTR station instance and hide its polygon
    activeMTRStations.set(venueId, mtrIndoor);
    hiddenMTRPolygons.add(venueId);

    // Hide all MTR venue polygons for this venue
    viewer.dataSources
      .getByName("mtr_venue_polygon")[0]
      .entities.values.filter((e) => e.properties.venue_id._value == venueId)
      .forEach((e) => {
        e.show = false;
      });

    // Load building network for this MTR station
    const networkSuccess = await loadBuildingNetworkForVenue(
      venueId,
      venueEngName
    );
    if (networkSuccess) {
      console.log(
        `✅ Building network loaded for MTR station "${venueEngName}"`
      );
    } else {
      console.warn(
        `⚠️ Could not load building network for MTR station "${venueEngName}"`
      );
    }

    console.log(
      `MTR station ${venueId} loaded successfully. Total active stations: ${activeMTRStations.size}`
    );
  } catch (error) {
    console.error(`Error loading MTR station ${venueId}:`, error);
  }
}

/**
 * Handles clicks on indoor feature elements (units, amenities, etc.)
 *
 * @param {Cesium.Entity} selectFeature - The clicked indoor feature entity
 */
function handleIndoorFeatureClick(selectFeature) {
  let descHtml = `<table class="cesium-infoBox-defaultTable">`;

  selectFeature.properties.propertyNames
    .filter((pName) => selectFeature.properties[pName]["_value"])
    .forEach((pName) => {
      descHtml += `<tr><th>${pName}</th><td>
        ${
          Array.isArray(selectFeature.properties[pName]["_value"])
            ? '<table class="cesium-infoBox-defaultTable"><tbody>' +
              selectFeature.properties[pName]["_value"]
                .map((v, i) => `<tr><th>${i}</th><td>${v}</td></tr>`)
                .join("") +
              "</tbody></table>"
            : selectFeature.properties[pName]
        }
      </td></tr>`;
    });

  descHtml += `</table>`;

  viewer.selectedEntity.name =
    selectFeature.properties[`${selectFeature.id.split("_")[0]}_id`];
  viewer.selectedEntity.description = descHtml;
}

/**
 * Handles clicks on MTR indoor feature elements
 *
 * @param {Cesium.Entity} selectFeature - The clicked MTR indoor feature entity
 */
function handleMTRIndoorFeatureClick(selectFeature) {
  let MTRdescHtml = `<table class="cesium-infoBox-defaultTable">`;

  selectFeature.properties.propertyNames
    .filter((pName) => selectFeature.properties[pName]["_value"])
    .forEach((pName) => {
      MTRdescHtml += `<tr><th>${pName}</th><td>
        ${
          Array.isArray(selectFeature.properties[pName]["_value"])
            ? '<table class="cesium-infoBox-defaultTable"><tbody>' +
              selectFeature.properties[pName]["_value"]
                .map((v, i) => `<tr><th>${i}</th><td>${v}</td></tr>`)
                .join("") +
              "</tbody></table>"
            : selectFeature.properties[pName]
        }
      </td></tr>`;
    });

  MTRdescHtml += `</table>`;

  viewer.selectedEntity.description = MTRdescHtml;
}

/**
 * Clears all active venues and MTR stations
 *
 * This function destroys all loaded venues and stations, clears the tracking maps,
 * and restores the visibility of all venue polygons.
 */
function clearAllVenues() {
  // Destroy all active venues
  activeVenues.forEach((venue, venueId) => {
    venue.destroy();
  });
  activeVenues.clear();

  // Destroy all active MTR stations
  activeMTRStations.forEach((station, venueId) => {
    station.destroy();
  });
  activeMTRStations.clear();

  // Remove all building networks
  activeBuildingNetworks.forEach((networkInfo, venueId) => {
    if (networkInfo.dataSource) {
      viewer.dataSources.remove(networkInfo.dataSource);
    }
  });
  activeBuildingNetworks.clear();

  // Clear building network cache (optional - you might want to keep cache)
  // buildingNetworkCache.clear();

  // Restore venue polygon visibility
  if (viewer.dataSources.getByName("venue_polygon").length > 0) {
    viewer.dataSources
      .getByName("venue_polygon")[0]
      .entities.values.forEach((entity) => {
        if (hiddenVenuePolygons.has(entity.properties.venue_id._value)) {
          entity.show = true;
        }
      });
  }

  // Restore MTR venue polygon visibility
  if (viewer.dataSources.getByName("mtr_venue_polygon").length > 0) {
    viewer.dataSources
      .getByName("mtr_venue_polygon")[0]
      .entities.values.forEach((entity) => {
        if (hiddenMTRPolygons.has(entity.properties.venue_id._value)) {
          entity.show = true;
        }
      });
  }

  // Clear tracking sets
  hiddenVenuePolygons.clear();
  hiddenMTRPolygons.clear();

  console.log("All venues, MTR stations, and building networks cleared");
}

/**
 * Gets status information about loaded venues
 *
 * @returns {Object} Status object with venue and MTR station counts
 */
function getVenueStatus() {
  return {
    activeVenues: activeVenues.size,
    activeMTRStations: activeMTRStations.size,
    venueIds: Array.from(activeVenues.keys()),
    mtrIds: Array.from(activeMTRStations.keys()),
  };
}

/**
 * Building Network Management Functions
 *
 * Handles fetching, caching, and displaying building network linestrings
 * with Z-clipping integration and visual styling.
 */

/**
 * Fetches building network data from API
 * @param {string} buildingName - The building display name
 * @returns {Promise<Object>} Network data or null if failed
 */
async function fetchBuildingNetwork(buildingName) {
  try {
    const encodedName = encodeURIComponent(buildingName);

    const response = await fetch(
      `${API_BASE_URL}/api/indoor-network/building?buildingName=${encodedName}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.result && data.result.features) {
      console.log(
        `✅ Fetched ${data.result.features.length} building network features for "${buildingName}"`
      );
      return data;
    } else {
      console.warn(`⚠️ No building network data found for "${buildingName}"`);
      return null;
    }
  } catch (error) {
    console.error(
      `❌ Failed to fetch building network for "${buildingName}":`,
      error
    );
    return null;
  }
}

/**
 * Creates and styles a building network DataSource
 * @param {string} venueId - The venue ID
 * @param {string} buildingName - The building name
 * @param {Object} networkData - The network GeoJSON data
 * @returns {Cesium.GeoJsonDataSource} Styled DataSource
 */
async function createBuildingNetworkDataSource(
  venueId,
  buildingName,
  networkData
) {
  const dataSourceName = `building_network_${venueId}`;
  const dataSource = new Cesium.GeoJsonDataSource(dataSourceName);

  // Load with blue styling for building networks
  await dataSource.load(networkData.result, {
    stroke: Cesium.Color.fromCssColorString("#0066CC"), // Blue color
    strokeWidth: 3,
    clampToGround: false,
  });

  // Apply Z-value styling and clipping awareness
  const entities = dataSource.entities.values;
  entities.forEach((entity) => {
    if (entity.polyline) {
      entity.polyline.material = Cesium.Color.fromCssColorString("#0066CC");
      entity.polyline.width = 3;
      entity.polyline.clampToGround = false;

      // Add building network identifier
      entity.buildingNetwork = true;
      entity.venueId = venueId;
      entity.buildingName = buildingName;

      // Store original show state for Z-clipping
      entity.originalShow = true;
    }
  });

  console.log(
    `🔵 Created building network DataSource for "${buildingName}" with ${entities.length} linestrings`
  );
  return dataSource;
}

/**
 * Loads building network for a venue with caching and error handling
 * @param {string} venueId - The venue ID
 * @param {string} buildingName - The building display name
 * @returns {Promise<boolean>} Success status
 */
async function loadBuildingNetworkForVenue(venueId, buildingName) {
  // Check if already loading or loaded
  if (activeBuildingNetworks.has(venueId)) {
    const existing = activeBuildingNetworks.get(venueId);
    if (existing.loading) {
      console.log(
        `⏳ Building network for "${buildingName}" is already loading...`
      );
      return false;
    }
    if (existing.dataSource) {
      console.log(
        `✅ Building network for "${buildingName}" is already loaded`
      );
      return true;
    }
  }

  // Set loading state
  activeBuildingNetworks.set(venueId, {
    loading: true,
    dataSource: null,
    data: null,
  });

  try {
    // Check cache first
    let networkData = buildingNetworkCache.get(buildingName);

    if (!networkData) {
      console.log(`🔍 Fetching building network for "${buildingName}"...`);
      networkData = await fetchBuildingNetwork(buildingName);

      if (networkData) {
        // Cache the data
        buildingNetworkCache.set(buildingName, networkData);
      } else {
        // No data available
        activeBuildingNetworks.delete(venueId);
        return false;
      }
    } else {
      console.log(
        `💾 Using cached building network data for "${buildingName}"`
      );
    }

    // Create DataSource
    const dataSource = await createBuildingNetworkDataSource(
      venueId,
      buildingName,
      networkData
    );

    // Add to viewer
    viewer.dataSources.add(dataSource);

    // Update tracking
    activeBuildingNetworks.set(venueId, {
      loading: false,
      dataSource: dataSource,
      data: networkData,
      buildingName: buildingName,
    });

    // Apply current Z-clipping immediately
    applyZClippingToBuildingNetwork(venueId, ZClippingManager.currentZValue);

    console.log(
      `✅ Successfully loaded building network for "${buildingName}"`
    );
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to load building network for "${buildingName}":`,
      error
    );
    activeBuildingNetworks.delete(venueId);
    return false;
  }
}

/**
 * Applies Z-clipping to a specific building network
 * @param {string} venueId - The venue ID
 * @param {number} zValue - The Z-clipping value
 */
function applyZClippingToBuildingNetwork(venueId, zValue) {
  const networkInfo = activeBuildingNetworks.get(venueId);
  if (!networkInfo || !networkInfo.dataSource) return;

  const entities = networkInfo.dataSource.entities.values;
  entities.forEach((entity) => {
    if (entity.polyline && entity.buildingNetwork) {
      try {
        let positions = null;

        // Try different ways to get positions from Cesium polyline
        if (entity.polyline.positions) {
          if (typeof entity.polyline.positions.getValue === "function") {
            positions = entity.polyline.positions.getValue(
              viewer.clock.currentTime
            );
          } else if (Array.isArray(entity.polyline.positions)) {
            positions = entity.polyline.positions;
          } else if (entity.polyline.positions._value) {
            positions = entity.polyline.positions._value;
          }
        }

        if (positions && positions.length > 0) {
          let hasVisiblePoint = false;

          // Check each position in the linestring
          for (let i = 0; i < positions.length; i++) {
            try {
              const cartographic = Cesium.Cartographic.fromCartesian(
                positions[i]
              );
              const heightInMeters = cartographic.height;

              // If any point is at or below the Z-clipping value, show the linestring
              if (heightInMeters <= zValue) {
                hasVisiblePoint = true;
                break;
              }
            } catch (posError) {
              // If we can't convert this position, assume it's visible
              hasVisiblePoint = true;
              break;
            }
          }

          // Show/hide the entity based on whether it has points below the clipping plane
          entity.show = hasVisiblePoint && entity.originalShow;
        } else {
          // Fallback: if we can't get positions, keep it visible
          entity.show = entity.originalShow;
        }
      } catch (error) {
        console.warn(
          `Error applying Z-clipping to building network entity:`,
          error
        );
        // Fallback: keep it visible if there's an error
        entity.show = entity.originalShow;
      }
    }
  });
}

/**
 * Removes building network for a venue
 * @param {string} venueId - The venue ID
 */
function removeBuildingNetworkForVenue(venueId) {
  const networkInfo = activeBuildingNetworks.get(venueId);
  if (networkInfo && networkInfo.dataSource) {
    viewer.dataSources.remove(networkInfo.dataSource);
    console.log(`🗑️ Removed building network for venue ${venueId}`);
  }
  activeBuildingNetworks.delete(venueId);
}

/**
 * Applies Z-clipping to all active building networks
 * @param {number} zValue - The Z-clipping value
 */
function applyZClippingToAllBuildingNetworks(zValue) {
  console.log(
    `🔵 Applying Z-clipping at ${zValue.toFixed(1)}m to ${
      activeBuildingNetworks.size
    } building networks`
  );
  activeBuildingNetworks.forEach((networkInfo, venueId) => {
    applyZClippingToBuildingNetwork(venueId, zValue);
  });
}

/**
 * Z-Value Clipping Manager
 *
 * This module provides centralized Z-value clipping functionality that applies
 * to all currently active venues and MTR stations simultaneously. It uses
 * entity visibility toggling for optimal performance.
 */
const ZClippingManager = {
  /**
   * Current clipping Z-value (-50 to +200 meters)
   * @type {number}
   */
  currentZValue: 200.0,

  /**
   * Initializes the Z-clipping control interface
   * Sets up the slider and its event handlers
   */
  init() {
    const slider = document.getElementById("z-clipping-slider");
    const valueDisplay = document.getElementById("z-clipping-value");

    if (!slider || !valueDisplay) {
      console.error("Z-clipping controls not found in DOM");
      return;
    }

    // Initialize slider value
    slider.value = this.currentZValue;
    valueDisplay.textContent = this.currentZValue.toFixed(1);

    // Add input event listener for real-time updates
    slider.addEventListener("input", (event) => {
      const newZValue = parseFloat(event.target.value);
      this.updateZClipping(newZValue);
      valueDisplay.textContent = newZValue.toFixed(1);
    });

    console.log("Z-clipping manager initialized");
  },

  /**
   * Updates Z-clipping for all active venues and MTR stations
   *
   * @param {number} maxZ - Maximum Z-value in meters
   */
  updateZClipping(maxZ) {
    this.currentZValue = maxZ;

    // Apply clipping to all active venues
    activeVenues.forEach((venue, venueId) => {
      if (venue && typeof venue.applyZClipping === "function") {
        venue.applyZClipping(maxZ);
      }
    });

    // Apply clipping to all active MTR stations
    activeMTRStations.forEach((station, stationId) => {
      if (station && typeof station.applyZClipping === "function") {
        station.applyZClipping(maxZ);
      }
    });

    // Apply clipping to all active building networks
    applyZClippingToAllBuildingNetworks(maxZ);

    console.log(
      `Applied Z-clipping at ${maxZ.toFixed(1)}m to ${
        activeVenues.size
      } venues, ${activeMTRStations.size} MTR stations, and ${
        activeBuildingNetworks.size
      } building networks`
    );
  },

  /**
   * Resets Z-clipping for all venues and MTR stations
   * Shows all entities regardless of Z-value
   */
  resetClipping() {
    // Reset clipping for all active venues
    activeVenues.forEach((venue, venueId) => {
      if (venue && typeof venue.resetZClipping === "function") {
        venue.resetZClipping();
      }
    });

    // Reset clipping for all active MTR stations
    activeMTRStations.forEach((station, stationId) => {
      if (station && typeof station.resetZClipping === "function") {
        station.resetZClipping();
      }
    });

    // Reset UI
    const slider = document.getElementById("z-clipping-slider");
    const valueDisplay = document.getElementById("z-clipping-value");

    if (slider && valueDisplay) {
      this.currentZValue = 200.0;
      slider.value = this.currentZValue;
      valueDisplay.textContent = this.currentZValue.toFixed(1);
    }

    console.log("Z-clipping reset for all venues and MTR stations");
  },

  /**
   * Gets the combined Z-value range of all active venues and MTR stations
   *
   * @returns {Object} Combined range: {min: number, max: number, venues: Array, stations: Array}
   */
  getCombinedZRange() {
    let globalMin = Infinity;
    let globalMax = -Infinity;
    const venueRanges = [];
    const stationRanges = [];

    // Get ranges from all active venues
    activeVenues.forEach((venue, venueId) => {
      if (venue && typeof venue.getZRange === "function") {
        const range = venue.getZRange();
        venueRanges.push({ id: venueId, ...range });
        globalMin = Math.min(globalMin, range.min);
        globalMax = Math.max(globalMax, range.max);
      }
    });

    // Get ranges from all active MTR stations
    activeMTRStations.forEach((station, stationId) => {
      if (station && typeof station.getZRange === "function") {
        const range = station.getZRange();
        stationRanges.push({ id: stationId, ...range });
        globalMin = Math.min(globalMin, range.min);
        globalMax = Math.max(globalMax, range.max);
      }
    });

    return {
      min: globalMin === Infinity ? -50 : globalMin,
      max: globalMax === -Infinity ? 200 : globalMax,
      venues: venueRanges,
      stations: stationRanges,
    };
  },

  /**
   * Applies current Z-clipping to a newly loaded venue/station
   * Called automatically when new venues are loaded
   *
   * @param {VenueIndoor|MTRIndoor} venueInstance - The newly loaded venue or station
   */
  applyToNewVenue(venueInstance) {
    if (venueInstance && typeof venueInstance.applyZClipping === "function") {
      venueInstance.applyZClipping(this.currentZValue);
      console.log(
        `Applied current Z-clipping (${this.currentZValue.toFixed(
          1
        )}m) to newly loaded venue`
      );
    }
  },
};

/**
 * 3D Tiles Clipping Manager
 *
 * This module provides Z-value clipping functionality for 3D Tilesets using
 * ClippingPlaneCollection with horizontal planes. Works with local coordinate
 * systems of each tileset independently.
 */
const TilesClippingManager = {
  /**
   * Current clipping Z-values for each tileset
   * @type {Object}
   */
  currentZValues: {
    indoorNetwork: 200.0,
    mtrNetwork: 200.0,
  },

  /**
   * Clipping plane collections for each tileset
   * @type {Object}
   */
  clippingPlanes: {
    indoorNetwork: null,
    mtrNetwork: null,
  },

  /**
   * Initializes the 3D Tiles clipping control interface
   * Sets up the sliders and their event handlers
   */
  init() {
    // Initialize Indoor Network clipping
    this.initTilesetClipping(
      "indoor-network",
      "indoorNetwork",
      () => window.indoorNetworkTiles
    );

    // Initialize MTR Network clipping
    this.initTilesetClipping(
      "mtr-network",
      "mtrNetwork",
      () => window.indoorMTRTiles
    );

    console.log("3D Tiles clipping manager initialized");
  },

  /**
   * Initializes clipping for a specific tileset
   *
   * @param {string} sliderId - ID prefix for the slider elements
   * @param {string} tilesetKey - Key for tracking this tileset
   * @param {Function} tilesetGetter - Function that returns the tileset object
   */
  initTilesetClipping(sliderId, tilesetKey, tilesetGetter) {
    const slider = document.getElementById(`${sliderId}-clipping-slider`);
    const valueDisplay = document.getElementById(`${sliderId}-clipping-value`);

    if (!slider || !valueDisplay) {
      console.warn(`${sliderId} clipping controls not found in DOM`);
      return;
    }

    // Initialize slider value
    slider.value = this.currentZValues[tilesetKey];
    valueDisplay.textContent = this.currentZValues[tilesetKey].toFixed(1);

    // Add input event listener for real-time updates
    slider.addEventListener("input", (event) => {
      const newZValue = parseFloat(event.target.value);
      this.updateTilesetClipping(tilesetKey, newZValue, tilesetGetter);
      valueDisplay.textContent = newZValue.toFixed(1);
    });
  },

  /**
   * Updates Z-clipping for a specific tileset
   *
   * @param {string} tilesetKey - Key for the tileset
   * @param {number} maxZ - Maximum Z-value in local coordinates
   * @param {Function} tilesetGetter - Function that returns the tileset object
   */
  updateTilesetClipping(tilesetKey, maxZ, tilesetGetter) {
    this.currentZValues[tilesetKey] = maxZ;

    const tileset = tilesetGetter();
    if (!tileset) {
      console.warn(`Tileset ${tilesetKey} not available yet`);
      return;
    }

    // Remove existing clipping planes
    if (this.clippingPlanes[tilesetKey]) {
      tileset.clippingPlanes = undefined;
      this.clippingPlanes[tilesetKey] = null;
    }

    // Create new horizontal clipping plane
    // The plane equation is: normal · (point - pointOnPlane) = 0
    // For a horizontal plane at height maxZ: (0, 0, 1) · (x, y, z - maxZ) = 0
    // This gives us: z = maxZ (everything below maxZ is visible)
    const clippingPlane = new Cesium.ClippingPlane(
      new Cesium.Cartesian3(0.0, 0.0, 1.0), // Normal vector pointing up
      -maxZ // Distance from origin (negative because we want z <= maxZ)
    );

    const clippingPlanes = new Cesium.ClippingPlaneCollection({
      planes: [clippingPlane],
      edgeWidth: 1.0,
      edgeColor: Cesium.Color.RED.withAlpha(0.5),
      enabled: true,
    });

    // Apply clipping to the tileset
    tileset.clippingPlanes = clippingPlanes;
    this.clippingPlanes[tilesetKey] = clippingPlanes;

    console.log(
      `Applied Z-clipping at ${maxZ.toFixed(1)} to ${tilesetKey} tileset`
    );
  },

  /**
   * Resets clipping for all 3D tilesets
   * Removes all clipping planes and restores full visibility
   */
  resetClipping() {
    Object.keys(this.currentZValues).forEach((tilesetKey) => {
      const tileset =
        tilesetKey === "indoorNetwork"
          ? window.indoorNetworkTiles
          : window.indoorMTRTiles;

      if (tileset && this.clippingPlanes[tilesetKey]) {
        tileset.clippingPlanes = undefined;
        this.clippingPlanes[tilesetKey] = null;
      }

      // Reset UI
      this.currentZValues[tilesetKey] = 200.0;
    });

    // Reset sliders
    const indoorSlider = document.getElementById(
      "indoor-network-clipping-slider"
    );
    const indoorValue = document.getElementById(
      "indoor-network-clipping-value"
    );
    const mtrSlider = document.getElementById("mtr-network-clipping-slider");
    const mtrValue = document.getElementById("mtr-network-clipping-value");

    if (indoorSlider && indoorValue) {
      indoorSlider.value = 200.0;
      indoorValue.textContent = "200.0";
    }

    if (mtrSlider && mtrValue) {
      mtrSlider.value = 200.0;
      mtrValue.textContent = "200.0";
    }

    console.log("3D Tiles clipping reset for all tilesets");
  },

  /**
   * Gets the current clipping state for all tilesets
   *
   * @returns {Object} Current clipping values and states
   */
  getClippingState() {
    return {
      currentValues: { ...this.currentZValues },
      activePlanes: Object.keys(this.clippingPlanes).filter(
        (key) => this.clippingPlanes[key] !== null
      ),
    };
  },
};

/**
 * Enhanced venue loading functions that integrate with Z-clipping
 */

/**
 * Enhanced venue click handler with Z-clipping integration
 */
async function handleVenueClickWithClipping(selectFeature) {
  const venueProperties = selectFeature.properties;
  const vaneEngName = venueProperties["venue_name_en"]._value;
  const venueId = selectFeature.properties["venue_id"]._value;
  console.log(`Venue clicked: ${venueId} (${vaneEngName})`);

  // Check if this venue is already loaded
  if (activeVenues.has(venueId)) {
    console.log(`Venue ${venueId} is already loaded`);
    return;
  }

  try {
    // Show loading state
    console.log(
      `🔄 Loading venue "${vaneEngName}" and its building network...`
    );

    // Create and initialize new VenueIndoor
    const venueIndoor = new VenueIndoor(viewer, venueId);
    await venueIndoor.init();
    venueIndoor.initVenueOption("#venueOption");
    await venueIndoor.flyTo();
    await venueIndoor.showAllFloor();

    // Store the venue instance and hide its polygon
    activeVenues.set(venueId, venueIndoor);
    hiddenVenuePolygons.add(venueId);
    selectFeature.show = false;

    // Apply current Z-clipping to the new venue
    ZClippingManager.applyToNewVenue(venueIndoor);

    // Load building network for this venue
    const networkSuccess = await loadBuildingNetworkForVenue(
      venueId,
      vaneEngName
    );
    if (networkSuccess) {
      console.log(`✅ Building network loaded for venue "${vaneEngName}"`);
    } else {
      console.warn(
        `⚠️ Could not load building network for venue "${vaneEngName}"`
      );
    }

    console.log(
      `Venue ${venueId} loaded successfully. Total active venues: ${activeVenues.size}`
    );
  } catch (error) {
    console.error(`Error loading venue ${venueId}:`, error);
    // Clean up on error
    activeBuildingNetworks.delete(venueId);
  }
}

/**
 * Enhanced MTR venue click handler with Z-clipping integration
 */
async function handleMTRVenueClickWithClipping(selectFeature) {
  const venueId = selectFeature.properties["venue_id"]._value;
  const venueEngName = selectFeature.properties["venue_eng_name"]._value;
  console.log(`MTR venue clicked: ${venueId} (${venueEngName})`);

  // Check if this MTR station is already loaded
  if (activeMTRStations.has(venueId)) {
    console.log(`MTR station ${venueId} is already loaded`);
    return;
  }

  try {
    // Show loading state
    console.log(
      `🔄 Loading MTR station "${venueEngName}" and its building network...`
    );

    // Create and initialize new MTRIndoor
    const mtrIndoor = new MTRIndoor(viewer, venueId);
    await mtrIndoor.init();
    mtrIndoor.initVenueOption("#venueOption");
    await mtrIndoor.flyTo();
    await mtrIndoor.showAllFloor();

    // Store the MTR station instance and hide its polygon
    activeMTRStations.set(venueId, mtrIndoor);
    hiddenMTRPolygons.add(venueId);

    // Hide all MTR venue polygons for this venue
    viewer.dataSources
      .getByName("mtr_venue_polygon")[0]
      .entities.values.filter((e) => e.properties.venue_id._value == venueId)
      .forEach((e) => {
        e.show = false;
      });

    // Apply current Z-clipping to the new station
    ZClippingManager.applyToNewVenue(mtrIndoor);

    // Load building network for this MTR station
    const networkSuccess = await loadBuildingNetworkForVenue(
      venueId,
      venueEngName
    );
    if (networkSuccess) {
      console.log(
        `✅ Building network loaded for MTR station "${venueEngName}"`
      );
    } else {
      console.warn(
        `⚠️ Could not load building network for MTR station "${venueEngName}"`
      );
    }

    console.log(
      `MTR station ${venueId} loaded successfully. Total active stations: ${activeMTRStations.size}`
    );
  } catch (error) {
    console.error(`Error loading MTR station ${venueId}:`, error);
    // Clean up on error
    activeBuildingNetworks.delete(venueId);
  }
}

/**
 * Sets up demo venues with indoor visualization
 *
 * NOTE: This function is kept for reference but not used in the main flow.
 * The app now uses interactive click-based venue loading instead.
 *
 * @async
 * @returns {Promise<void>}
 */
async function setupDemoVenues() {
  // Set up TKO Government venue
  window.VenueIndoor = VenueIndoor;
  const TKOVenue = new VenueIndoor(viewer, TKOGOVENUEID);
  await TKOVenue.init();
  TKOVenue.showAllFloor();
  TKOVenue.flyTo();

  // Hide the venue polygon for this venue
  viewer.dataSources
    .getByName("venue_polygon")[0]
    .entities.values.filter((e) => e.properties.venue_id == TKOGOVENUEID)
    .forEach((e) => (e.show = false));

  // Set up MTR TKO station
  window.MTRIndoor = MTRIndoor;
  const MTRTKO = new MTRIndoor(viewer, TKOGOMTRID);
  await MTRTKO.init();
  MTRTKO.showAllFloor();

  // Hide the MTR venue polygon for this venue
  viewer.dataSources
    .getByName("mtr_venue_polygon")[0]
    .entities.values.filter((e) => e.properties.venue_id == TKOGOMTRID)
    .forEach((e) => (e.show = false));

  // Set up Tsing Yi Station from local data
  const localPaths = {
    mtr_venue_polygon: "./data/Tsing Yi Station/mtr_venue.geojson",
    mtr_level_polygon: "./data/Tsing Yi Station/mtr_level.geojson",
    mtr_unit_polygon: "./data/Tsing Yi Station/mtr_unit.geojson",
    mtr_opening_line: "./data/Tsing Yi Station/mtr_opening.geojson",
    mtr_amenity_point: "./data/Tsing Yi Station/mtr_amenity_1.geojson",
    mtr_occupant_point: "./data/Tsing Yi Station/mtr_occupant.geojson",
  };

  const TsingYiStation = new MTRIndoor(viewer, "tsing-yi-station", localPaths);
  await TsingYiStation.init();
  TsingYiStation.showAllFloor();
  TsingYiStation.flyTo();

  console.log("Demo venues setup complete");
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
    window.VenueIndoor = VenueIndoor;
    window.MTRIndoor = MTRIndoor;

    // Export venue management functions
    window.clearAllVenues = clearAllVenues;
    window.getVenueStatus = getVenueStatus;
    window.activeVenues = activeVenues;
    window.activeMTRStations = activeMTRStations;

    // Export Z-clipping manager
    window.ZClippingManager = ZClippingManager;

    // Export 3D Tiles clipping manager
    window.TilesClippingManager = TilesClippingManager;

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
