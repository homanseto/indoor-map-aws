/**
 * Application State Hooks and Utilities
 *
 * Provides convenience functions and reactive hooks for working with AppState.
 * Designed to make state management more ergonomic and React-like without React.
 *
 * @version 1.0.0
 */

import { appState } from "./AppState.js";

/**
 * State Hook System - React-like hooks without React
 */
export class StateHooks {
  /**
   * Create a reactive hook for state changes
   * @param {function} selector - Function to select state slice
   * @param {function} callback - Callback when state changes
   * @returns {function} Cleanup function
   */
  static useStateSlice(selector, callback) {
    let currentValue = selector(appState);

    const unsubscribeCallbacks = [];

    // Subscribe to relevant state changes
    const events = [
      "buildingAdded",
      "buildingRemoved",
      "networkAdded",
      "networkRemoved",
      "lastActiveVenueChanged",
      "viewModeChanged",
      "venueDataChanged",
      "processingClickChanged",
      "allActiveCleared",
      "unitLabelStateChanged",
      "kickModeChanged",
    ];

    events.forEach((event) => {
      const unsubscribe = appState.subscribe(event, () => {
        const newValue = selector(appState);
        if (newValue !== currentValue) {
          currentValue = newValue;
          callback(newValue);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    // Return cleanup function
    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    };
  }

  /**
   * Hook for building state changes
   * @param {function} callback - Callback with building data
   * @returns {function} Cleanup function
   */
  static useBuildingState(callback) {
    return this.useStateSlice(
      (state) => ({
        activeBuildings: state.getAllActiveBuildings(),
        lastActiveVenueId: state.getLastActiveVenueId(),
        count: state.getAllActiveBuildings().size,
      }),
      callback
    );
  }

  /**
   * Hook for UI state changes
   * @param {function} callback - Callback with UI data
   * @returns {function} Cleanup function
   */
  static useUIState(callback) {
    return this.useStateSlice(
      (state) => ({
        viewMode: state.getViewMode(),
        isProcessing: state.isClickProcessing(),
        lastActiveVenue: state.getLastActiveVenueId(),
        kickMode: state.getKickMode(),
      }),
      callback
    );
  }

  /**
   * Hook for viewer state
   * @param {function} callback - Callback with viewer data
   * @returns {function} Cleanup function
   */
  static useViewerState(callback) {
    return this.useStateSlice(
      (state) => ({
        viewer: state.getViewer(),
        sidebar: state.getMapSidebar(),
        hasViewer: !!state.getViewer(),
      }),
      callback
    );
  }

  static useUnitLabelState(callback) {
    return this.useStateSlice((state) => state.getUnitLabelState(), callback);
  }
}

/**
 * Convenience Functions for Common Operations
 */
export class StateActions {
  /**
   * Initialize application with viewer
   * @param {Cesium.Viewer} viewer
   */
  static initializeApp(viewer) {
    appState.setViewer(viewer);
    console.log("[StateActions] Application initialized with viewer");
  }

  /**
   * Load building with full state management
   * @param {string} venueId
   * @param {BuildingIndoor} building
   * @param {IndoorNetwork} network
   */
  static loadBuilding(venueId, building, network = null) {
    // Switch from previous building if needed
    const lastActive = appState.getLastActiveVenueId();
    if (lastActive && lastActive !== venueId) {
      StateActions.deactivateBuilding(lastActive);
    }

    // Set new building as active
    appState.setActiveBuilding(venueId, building);
    if (network) {
      appState.setActiveNetwork(venueId, network);
    }
    appState.setLastActiveVenueId(venueId);

    // Hide venue polygon
    appState.addHiddenVenuePolygon(venueId);

    console.log(`[StateActions] Building ${venueId} loaded and activated`);
  }

  /**
   * Deactivate building but keep it loaded
   * @param {string} venueId
   */
  static deactivateBuilding(venueId) {
    const building = appState.getActiveBuilding(venueId);
    if (building && typeof building.resetLevelBarAndShowAll === "function") {
      building.resetLevelBarAndShowAll();
    }

    const network = appState.getActiveNetwork(venueId);
    if (network && typeof network.showNetwork === "function") {
      network.showNetwork();
    }

    console.log(`[StateActions] Building ${venueId} deactivated`);
  }

  /**
   * Completely remove building from state
   * @param {string} venueId
   */
  static removeBuilding(venueId) {
    const building = appState.getActiveBuilding(venueId);
    const network = appState.getActiveNetwork(venueId);

    // Clean up building
    if (building && typeof building.destroy === "function") {
      building.destroy();
    }

    // Clean up network
    if (network && typeof network.destroy === "function") {
      network.destroy();
    }

    // Remove from state
    appState.removeActiveBuilding(venueId);
    appState.removeActiveNetwork(venueId);
    appState.removeHiddenVenuePolygon(venueId);

    console.log(`[StateActions] Building ${venueId} completely removed`);
  }

  /**
   * Switch between 2D and 3D modes
   * @param {'2D'|'3D'} mode
   */
  static switchViewMode(mode) {
    const currentMode = appState.getViewMode();
    if (currentMode === mode) return;

    appState.setViewMode(mode);

    // Notify sidebar about mode change
    const sidebar = appState.getMapSidebar();
    if (sidebar && typeof sidebar.onViewModeChanged === "function") {
      sidebar.onViewModeChanged(mode === "2D");
    }

    console.log(
      `[StateActions] View mode switched from ${currentMode} to ${mode}`
    );
  }

  /**
   * Toggle between 2D and 3D modes
   */
  static toggleViewMode() {
    const currentMode = appState.getViewMode();
    const newMode = currentMode === "2D" ? "3D" : "2D";
    StateActions.switchViewMode(newMode);
  }

  /**
   * Reset application to clean state
   */
  static resetApplication() {
    // Clean up all active buildings
    const activeBuildings = appState.getAllActiveBuildings();
    activeBuildings.forEach((building, venueId) => {
      StateActions.removeBuilding(venueId);
    });

    // Clear all state
    appState.clearAllActive();
    appState.clearAllCaches();
    appState.setViewMode("3D");

    console.log("[StateActions] Application reset to clean state");
  }

  /**
   * Apply Z-clipping to all active elements
   * @param {number} zValue
   */
  static applyZClipping(zValue) {
    const buildings = appState.getAllActiveBuildings();
    const networks = appState.getAllActiveNetworks();

    buildings.forEach((building) => {
      if (building && typeof building.applyZClipping === "function") {
        building.applyZClipping(zValue);
      }
    });

    networks.forEach((network) => {
      if (network && typeof network.applyZClipping === "function") {
        network.applyZClipping(zValue);
      }
    });

    console.log(`[StateActions] Z-clipping applied: ${zValue}`);
  }
}

/**
 * State Validators
 */
export class StateValidators {
  /**
   * Check if application is properly initialized
   * @returns {boolean}
   */
  static isAppInitialized() {
    return !!appState.getViewer() && !!appState.getVenueGeoJson();
  }

  /**
   * Check if building can be loaded
   * @param {string} venueId
   * @returns {boolean}
   */
  static canLoadBuilding(venueId) {
    if (!StateValidators.isAppInitialized()) return false;
    if (appState.isClickProcessing()) return false;

    const venue = appState.findVenueById(venueId);
    return !!venue;
  }

  /**
   * Check if 2D mode can be activated
   * @returns {boolean}
   */
  static canActivate2DMode() {
    const lastActive = appState.getLastActiveVenueId();
    return !!lastActive && appState.isBuildingActive(lastActive);
  }
}

/**
 * Development Tools
 */
export class StateDev {
  /**
   * Log current application state
   */
  static logState() {
    console.group("[StateDev] Current Application State");
    console.log("Status:", appState.getStatus());
    console.log("Debug Info:", appState.getDebugInfo());
    console.log("Exported State:", appState.exportState());
    console.groupEnd();
  }

  /**
   * Monitor state changes with logging
   * @returns {function} Stop monitoring function
   */
  static monitorStateChanges() {
    const events = [
      "buildingAdded",
      "buildingRemoved",
      "networkAdded",
      "networkRemoved",
      "lastActiveVenueChanged",
      "viewModeChanged",
      "venueDataChanged",
      "allActiveCleared",
      "historyChanged",
      "unitLabelStateChanged",
    ];

    const unsubscribes = events.map((event) =>
      appState.subscribe(event, (data) => {
        console.log(`[StateDev] ${event}:`, data);
      })
    );

    console.log("[StateDev] State monitoring started");

    // Return stop function
    return () => {
      unsubscribes.forEach((unsub) => unsub());
      console.log("[StateDev] State monitoring stopped");
    };
  }

  /**
   * Simulate state changes for testing
   */
  static simulateStateChanges() {
    console.log("[StateDev] Simulating state changes...");

    // Simulate view mode changes
    setTimeout(() => appState.setViewMode("2D"), 1000);
    setTimeout(() => appState.setViewMode("3D"), 2000);

    // Simulate building operations
    setTimeout(() => appState.setLastActiveVenueId("test-venue-1"), 3000);
    setTimeout(() => appState.setLastActiveVenueId("test-venue-2"), 4000);
    setTimeout(() => appState.setLastActiveVenueId(null), 5000);
  }

  /**
   * Export state history for debugging
   * @returns {Array}
   */
  static exportHistory() {
    const debugInfo = appState.getDebugInfo();
    console.log("[StateDev] History exported:", debugInfo.history);
    return debugInfo.history;
  }
}

// Make development tools available globally
if (typeof window !== "undefined") {
  window.StateHooks = StateHooks;
  window.StateActions = StateActions;
  window.StateValidators = StateValidators;
  window.StateDev = StateDev;
}
