/**
 * Cesium Configuration Module
 *
 * This module handles the initialization and configuration of the Cesium 3D viewer
 * for the Hong Kong 3D Indoor Map application. It sets up the viewer with Hong Kong
 * government basemap services and appropriate camera positioning.
 *
 * @module CesiumConfig
 */

/* ================================
   CONFIGURATION CONSTANTS
   ================================ */

/**
 * API endpoints and service URLs for Hong Kong government mapping services
 */
export const MAP_CONFIG = {
  // Hong Kong Government basemap tile service
  basemapUrl:
    "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png",

  // Hong Kong Government label overlay service
  labelUrl:
    "https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png",

  // Attribution credit for Lands Department
  creditHtml:
    '<div style="display:flex"><a href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank">© Map information from Lands Department</a>&nbsp;<img style="height:20px;" src="https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg"/></div>',

  // Default camera position over Hong Kong
  defaultCamera: {
    longitude: 114.11602,
    latitude: 22.34563,
    height: 100000,
    heading: 0.0,
    pitch: -90.0,
  },

  // Hong Kong boundary rectangle for default view
  viewRectangle: {
    west: 113.78953,
    south: 22.20251,
    east: 114.44081,
    north: 22.49369,
  },
};

/* ================================
   CESIUM VIEWER INITIALIZATION
   ================================ */

/**
 * Initializes and configures the Cesium 3D viewer with Hong Kong-specific settings
 *
 * @param {string} containerId - The ID of the DOM element to contain the viewer
 * @returns {Cesium.Viewer} The configured Cesium viewer instance
 *
 * @example
 * import { initializeCesiumViewer } from './cesium-config.js';
 * const viewer = initializeCesiumViewer('cesiumContainer');
 */
export function initializeCesiumViewer(containerId) {
  console.log("Initializing Cesium viewer for Hong Kong 3D Indoor Map...");

  // Create basemap imagery provider with Hong Kong government tiles
  const basemapProvider = new Cesium.UrlTemplateImageryProvider({
    url: MAP_CONFIG.basemapUrl,
    credit: MAP_CONFIG.creditHtml,
  });

  // Create the base imagery layer
  const basemapLayer = new Cesium.ImageryLayer(basemapProvider);
  // basemapLayer.alpha = 0.7;

  // Initialize Cesium viewer with optimized settings for 3D indoor mapping
  const viewer = new Cesium.Viewer(containerId, {
    baseLayer: basemapLayer,
    shadows: false, // Disable shadows for performance
    baseLayerPicker: false, // Disable base layer picker (we use fixed HK gov layers)
    sceneModePicker: false, // Disable scene mode picker (3D only)
    fullscreenButton: false, // Disable fullscreen button
    homeButton: false, // Disable home button
    vrButton: false, // Disable VR/help button
    geocoder: false, // Disable geocoder search
    timeline: false, // Disable timeline (not needed for indoor mapping)
    animation: false, // Disable animation controls
    scene3DOnly: false, //
  });

  // Remove any default imagery layers
  // viewer.imageryLayers.removeAll();

  // configure2DBasemap(viewer);

  // Configure viewer credits display
  configureCredits(viewer, basemapProvider);

  // Add Hong Kong government label layer
  addLabelLayer(viewer);

  // Set initial camera view over Hong Kong
  setCameraView(viewer);

  // Configure default view settings
  configureDefaultView();

  // Remove any remaining toolbar elements
  removeRemainingToolbarElements(viewer);

  configureUndergroundBasemap(viewer);

  // Enable performance debugging
  viewer.scene.debugShowFramesPerSecond = true;

  console.log("Cesium viewer initialized successfully");
  return viewer;
}

function configure2DBasemap(viewer) {
  const scene = viewer.scene;
  const globe = scene.globe;

  // Configure globe as flat 2D surface
  // globe.depthTestAgainstTerrain = false;
  // globe.showGroundAtmosphere = false; // Remove atmospheric effects
  // globe.baseColor = Cesium.Color.WHITE; // Set base color to white

  // Ensure the basemap is always rendered below everything
  globe.backFaceCulling = false;

  // Enable depth testing but allow underground viewing
  scene.globe.depthTestAgainstTerrain = false;

  // Disable terrain sampling - treat as flat surface
  if (viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider) {
    // This is already flat, but we'll make sure
    console.log("Using flat ellipsoid terrain provider");
  }
  // Configure camera to work with 2D basemap but allow 3D data above
  // scene.screenSpaceCameraController.enableCollisionDetection = false;
  // scene.screenSpaceCameraController.minimumZoomDistance = 1;
  scene.screenSpaceCameraController.maximumZoomDistance = 10000000;
}

// Advanced underground basemap configuration
export function configureUndergroundBasemap(viewer, undergroundOffset = -50) {
  const scene = viewer.scene;
  const globe = scene.globe;

  console.log("Configuring underground basemap with color preservation...");

  // Configure globe for underground viewing while preserving colors
  globe.depthTestAgainstTerrain = false;
  globe.showGroundAtmosphere = false;
  // Don't set baseColor to TRANSPARENT - this causes white rendering
  // globe.baseColor = Cesium.Color.TRANSPARENT; // REMOVE THIS LINE

  // Configure imagery layers for transparency without losing color
  const imageryLayers = scene.imageryLayers;

  // Make basemap semi-transparent but keep colors
  for (let i = 0; i < imageryLayers.length; i++) {
    const layer = imageryLayers.get(i);
    // layer.alpha = 0.6; // Semi-transparent but visible
    // Don't modify the imagery provider - keep original colors
  }

  // Enable camera underground movement
  scene.screenSpaceCameraController.enableCollisionDetection = false;
  scene.screenSpaceCameraController.minimumZoomDistance = 1;
  scene.logarithmicDepthBuffer = true;

  // Alternative approach: Lower the globe surface instead of imagery
  configureGlobeSurfaceHeight(viewer, undergroundOffset);

  console.log(
    `Configured underground basemap with ${undergroundOffset}m offset and color preservation`
  );
}

function configureGlobeSurfaceHeight(viewer, heightOffset) {
  const scene = viewer.scene;

  // Create a custom terrain provider that positions the surface lower
  const customTerrain = new Cesium.CustomHeightmapTerrainProvider({
    callback: function (x, y, level) {
      // Return a height map that places the surface at the desired offset
      const width = 65;
      const height = 65;
      const heights = new Float32Array(width * height);

      // Fill with the desired underground height
      for (let i = 0; i < heights.length; i++) {
        heights[i] = heightOffset; // All points at underground level
      }

      return heights;
    },
    width: 65,
    height: 65,
  });

  // Don't replace the terrain provider as it might break other functionality
  // Instead, just ensure proper depth testing is configured
  scene.globe.depthTestAgainstTerrain = false;
}

// //  Configure Globe for Underground Viewing
export function configureGlobeForUnderground(viewer) {
  const scene = viewer.scene;
  const globe = scene.globe;

  // Key settings for underground viewing
  globe.depthTestAgainstTerrain = false; // Allow seeing through terrain
  globe.showGroundAtmosphere = false; // Remove atmospheric blue effect
  globe.baseColor = Cesium.Color.TRANSPARENT; // Make globe transparent

  // Configure imagery layers to be translucent
  viewer.scene.imageryLayers.get(0).alpha = 0.3; // Make basemap semi-transparent

  // Enable underground camera movement
  scene.screenSpaceCameraController.enableCollisionDetection = false;
  scene.screenSpaceCameraController.minimumZoomDistance = 1; // Allow very close zoom

  // Configure camera for underground viewing
  scene.logarithmicDepthBuffer = true; // Better depth precision

  console.log("Configured globe for underground viewing");
}

/* ================================
   HELPER FUNCTIONS
   ================================ */

/**
 * Configures the credits display for the viewer
 *
 * @param {Cesium.Viewer} viewer - The Cesium viewer instance
 * @param {Cesium.UrlTemplateImageryProvider} basemapProvider - The basemap provider
 */
function configureCredits(viewer, basemapProvider) {
  // Set the credits to show Lands Department attribution
  const creditsElement = document.querySelector(".cesium-widget-credits");
  if (creditsElement) {
    creditsElement.innerHTML = basemapProvider.credit.html;
  }
}

/**
 * Adds the Hong Kong government label overlay layer
 *
 * @param {Cesium.Viewer} viewer - The Cesium viewer instance
 */
function addLabelLayer(viewer) {
  const labelProvider = new Cesium.UrlTemplateImageryProvider({
    url: MAP_CONFIG.labelUrl,
  });

  const labelLayer = new Cesium.ImageryLayer(labelProvider);
  viewer.scene.imageryLayers.add(labelLayer);

  console.log("Added Hong Kong government label layer");
}

/**
 * Sets the initial camera view to focus on Hong Kong
 *
 * @param {Cesium.Viewer} viewer - The Cesium viewer instance
 */
function setCameraView(viewer) {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      MAP_CONFIG.defaultCamera.longitude,
      MAP_CONFIG.defaultCamera.latitude,
      MAP_CONFIG.defaultCamera.height
    ),
    orientation: {
      heading: Cesium.Math.toRadians(MAP_CONFIG.defaultCamera.heading),
      pitch: Cesium.Math.toRadians(MAP_CONFIG.defaultCamera.pitch),
    },
  });

  console.log("Set camera view to Hong Kong region");
}

/**
 * Configures default camera view settings for Hong Kong boundary
 */
function configureDefaultView() {
  // Set the default view rectangle to Hong Kong boundaries
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(
    MAP_CONFIG.viewRectangle.west,
    MAP_CONFIG.viewRectangle.south,
    MAP_CONFIG.viewRectangle.east,
    MAP_CONFIG.viewRectangle.north
  );

  // Set view factor to 0 for immediate zoom to bounds
  Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

  console.log("Configured default view rectangle for Hong Kong");
}

/* ================================
   UTILITY FUNCTIONS
   ================================ */

/**
 * Creates a screen space event handler for the viewer
 * This is commonly needed for handling user interactions
 *
 * @param {Cesium.Viewer} viewer - The Cesium viewer instance
 * @returns {Cesium.ScreenSpaceEventHandler} The event handler
 */
export function createEventHandler(viewer) {
  if (!viewer || !viewer.scene || !viewer.scene.canvas) {
    console.error("Invalid viewer provided to createEventHandler");
    return null;
  }

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  console.log("Created screen space event handler");
  return handler;
}

/**
 * Removes any remaining toolbar elements that might still be visible
 * This ensures a completely clean interface for custom controls
 *
 * @param {Cesium.Viewer} viewer - The Cesium viewer instance
 */
function removeRemainingToolbarElements(viewer) {
  // Wait for the viewer to fully initialize before attempting to remove elements
  setTimeout(() => {
    try {
      // Remove the entire toolbar container if it exists
      const toolbar = viewer.container.querySelector(".cesium-viewer-toolbar");
      if (toolbar) {
        toolbar.style.display = "none";
      }

      // Remove any remaining button containers
      const buttonContainers = viewer.container.querySelectorAll(
        ".cesium-button, .cesium-toolbar-button, .cesium-navigation-help-button"
      );
      buttonContainers.forEach((button) => {
        button.style.display = "none";
      });

      console.log("Removed remaining Cesium toolbar elements");
    } catch (error) {
      console.warn("Could not remove all toolbar elements:", error);
    }
  }, 100); // Small delay to ensure DOM is ready
}

/**
 * Gets the current map configuration
 * Useful for other modules that need access to the same endpoints
 *
 * @returns {Object} The current map configuration object
 */
export function getMapConfig() {
  return { ...MAP_CONFIG }; // Return a copy to prevent modification
}
