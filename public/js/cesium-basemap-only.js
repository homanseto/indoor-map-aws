// public/js/cesium-basemap-only.js
// Initializes only the Cesium viewer (basemap), no data/features, using HKMap config.

import { initializeCesiumViewer } from "./cesium-config.js";

export let viewer = null;

window.initCesiumBasemap = function () {
  if (window.viewer) {
    viewer = window.viewer;
    return viewer;
  }
  viewer = initializeCesiumViewer("cesiumContainer");
  window.viewer = viewer;
  return viewer;
};

// Auto-initialize on load
window.initCesiumBasemap();
