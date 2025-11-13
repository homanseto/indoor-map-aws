// public/js/cesium-basemap-only.js
// Initializes only the Cesium viewer (basemap), no data/features, using HKMap config.

import { initializeCesiumViewer } from "./cesium-config.js";
import { appState } from "./shared/AppState.js";

// Removed: export let viewer = null; (SSOT violation)
// Viewer is now managed exclusively by AppState

window.initCesiumBasemap = function () {
  // Check if viewer already exists in AppState (single source of truth)
  let viewer = appState.getViewer();

  if (viewer) {
    // Maintain backward compatibility with window.viewer
    window.viewer = viewer;
    return viewer;
  }

  // Create new viewer and set it in AppState
  viewer = initializeCesiumViewer("cesiumContainer");
  appState.setViewer(viewer);

  // Maintain backward compatibility with window.viewer
  window.viewer = viewer;

  return viewer;
};

// Auto-initialize on load
window.initCesiumBasemap();
