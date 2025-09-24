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

  // Initialize Cesium viewer with optimized settings for 3D indoor mapping
  const viewer = new Cesium.Viewer(containerId, {
    baseLayer: basemapLayer,
    shadows: false, // Disable shadows for performance
    baseLayerPicker: false, // Disable base layer picker (we use fixed HK gov layers)
    sceneModePicker: false, // Disable scene mode picker (3D only)
    fullscreenButton: false, // Disable fullscreen button
    geocoder: false, // Disable geocoder search
    timeline: false, // Disable timeline (not needed for indoor mapping)
    animation: false, // Disable animation controls
    scene3DOnly: true, // Force 3D mode only
  });

  // Configure viewer credits display
  configureCredits(viewer, basemapProvider);

  // Add Hong Kong government label layer
  addLabelLayer(viewer);

  // Set initial camera view over Hong Kong
  setCameraView(viewer);

  // Configure default view settings
  configureDefaultView();

  // Enable performance debugging
  viewer.scene.debugShowFramesPerSecond = true;

  console.log("Cesium viewer initialized successfully");
  return viewer;
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
 * Gets the current map configuration
 * Useful for other modules that need access to the same endpoints
 *
 * @returns {Object} The current map configuration object
 */
export function getMapConfig() {
  return { ...MAP_CONFIG }; // Return a copy to prevent modification
}
