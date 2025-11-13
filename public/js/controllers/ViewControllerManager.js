/**
 * View Controller Manager
 *
 * Coordinates between centralized AppState and actual view operations.
 * Ensures state changes trigger correct view updates without direct coupling.
 *
 * This controller is the bridge that solves the "state updates but view doesn't change" problem
 * by listening to state changes and executing the corresponding view operations.
 */

import { appState } from "../shared/AppState.js";
import { StateHooks, StateActions } from "../shared/AppStateHooks.js";
import { notificationSystem } from "../ui/NotificationSystem.js";

export class ViewControllerManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.sidebar = null;

    // Building context
    this.currentBuilding = null;
    this.currentVenueId = null;

    // State hook cleanup functions
    this.stateCleanups = [];
    this.currentViewMode = appState.getViewMode();

    this.init();
  }

  /**
   * Initialize the controller and setup state listeners
   */
  init() {
    // Set viewer in AppState
    appState.setViewer(this.viewer);

    // Setup state event listeners
    this.setupStateListeners();

    console.log(
      "[ViewControllerManager] Initialized and listening to state changes"
    );
  }

  registerSidebar(sidebar) {
    this.sidebar = sidebar;
    appState.setMapSidebar(sidebar);
    console.log("[ViewControllerManager] Sidebar registered");
  }

  /**
   * Setup state change listeners for reactive view updates
   */
  setupStateListeners() {
    // Listen for view mode changes and update actual view
    const viewModeCleanup = StateHooks.useUIState((uiState) => {
      this.handleViewModeChange(uiState.viewMode);
    });
    this.stateCleanups.push(viewModeCleanup);

    // Listen for building changes and update view context
    const buildingCleanup = StateHooks.useBuildingState((buildingState) => {
      this.handleBuildingContextChange(buildingState);
    });
    this.stateCleanups.push(buildingCleanup);

    // Listen for viewer state changes
    const viewerCleanup = StateHooks.useViewerState((viewerState) => {
      this.handleViewerStateChange(viewerState);
    });
    this.stateCleanups.push(viewerCleanup);
  }

  /**
   * Handle view mode changes from state
   * This is where state changes get translated to actual view operations
   */
  handleViewModeChange(newViewMode) {
    console.log(`[ViewControllerManager] 📊 Current state before change:`, {
      currentBuilding: !!this.currentBuilding,
      currentVenueId: this.currentVenueId,
      appStateMode: appState.getViewMode(),
    });
    if (this.currentViewMode === newViewMode) {
      return; // no change; skip re-entering 2D
    }
    this.currentViewMode = newViewMode;

    // Check if we have the required building context for 2D mode
    if (newViewMode === "2D") {
      // First, refresh building references to ensure we have latest data
      this.refreshBuildingReferences();

      if (!this.currentBuilding || !this.currentVenueId) {
        console.warn(
          "[ViewControllerManager] ⚠️ No building context for 2D mode after refresh"
        );
        console.log("[ViewControllerManager] 🏢 Building context details:", {
          hasBuilding: !!this.currentBuilding,
          venueId: this.currentVenueId,
          allActiveBuildings: appState.getAllActiveBuildings().size,
          lastActiveVenue: appState.getLastActiveVenueId(),
          availableVenues: Array.from(appState.getAllActiveBuildings().keys()),
        });

        // // Show user-friendly notification instead of reverting state
        // notificationSystem.buildingRequired();

        // Revert state back to 3D
        appState.setViewMode("3D");
        return;
      }

      console.log(
        "[ViewControllerManager] ✅ Building context available after refresh, entering 2D mode"
      );
    } else if (newViewMode === "3D") {
    }
  }

  /**
   * Handle building context changes
   */
  handleBuildingContextChange(buildingState) {
    const { activeBuildings, lastActiveVenueId } = buildingState;

    console.log(`[ViewControllerManager] 🏢 Building context change:`, {
      lastActiveVenueId,
      activeBuildingsCount: activeBuildings.size,
      previousBuilding: !!this.currentBuilding,
      previousVenueId: this.currentVenueId,
    });

    if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
      // Update current building context
      this.currentBuilding = activeBuildings.get(lastActiveVenueId);
      this.currentVenueId = lastActiveVenueId;

      console.log(
        `[ViewControllerManager] ✅ Building context updated: ${lastActiveVenueId}`
      );

      // Notify sidebar about building availability
      if (this.sidebar) {
        this.sidebar.setBuildingContext(
          this.currentBuilding,
          this.currentVenueId
        );
      }
    } else {
      // Clear building context
      console.log(`[ViewControllerManager] 🧹 Clearing building context`);
      this.clearBuildingContext();
    }
  }

  /**
   * Refresh building references from current state
   * This ensures the controller has the latest building data
   */
  refreshBuildingReferences() {
    const lastActiveVenueId = appState.getLastActiveVenueId();
    const activeBuildings = appState.getAllActiveBuildings();

    console.log(`[ViewControllerManager] 🔄 Refreshing building references:`, {
      lastActiveVenueId,
      activeBuildingsCount: activeBuildings.size,
      availableBuildings: Array.from(activeBuildings.keys()),
    });

    if (lastActiveVenueId && activeBuildings.has(lastActiveVenueId)) {
      this.currentBuilding = activeBuildings.get(lastActiveVenueId);
      this.currentVenueId = lastActiveVenueId;
      console.log(
        `[ViewControllerManager] ✅ Building references refreshed: ${lastActiveVenueId}`
      );
    } else {
      this.currentBuilding = null;
      this.currentVenueId = null;
      console.log(`[ViewControllerManager] ⚠️ No active building found`);
    }
  }

  /**
   * Handle viewer state changes
   */
  handleViewerStateChange(viewerState) {
    if (!viewerState.hasViewer && this.viewer) {
      console.log(
        "[ViewControllerManager] Viewer reference lost, updating state"
      );
      appState.setViewer(this.viewer);
    }
  }

  /**
   * Clear building context when building is unloaded
   */
  clearBuildingContext() {
    console.log("[ViewControllerManager] Clearing building context");

    // Exit 2D mode if currently active
    if (appState.isIn2DMode()) {
      appState.setViewMode("3D");
    }

    this.currentBuilding = null;
    this.currentVenueId = null;

    // Notify sidebar
    if (this.sidebar) {
      this.sidebar.clearBuildingContext();
    }
  }

  /**
   * Set building context (called when building is loaded)
   */
  setBuildingContext(building, venueId) {
    console.log(`[ViewControllerManager] Setting building context: ${venueId}`);

    this.currentBuilding = building;
    this.currentVenueId = venueId;

    // Update AppState
    appState.setActiveBuilding(venueId, building);
    appState.setLastActiveVenueId(venueId);

    // Notify sidebar
    if (this.sidebar) {
      this.sidebar.setBuildingContext(building, venueId);
    }
  }

  /**
   * Toggle between 2D and 3D modes
   */
  toggleViewMode() {
    const currentMode = appState.getViewMode();
    const newMode = currentMode === "2D" ? "3D" : "2D";

    console.log(
      `[ViewControllerManager] Toggling view mode: ${currentMode} -> ${newMode}`
    );
    appState.setViewMode(newMode);
  }

  /**
   * Force synchronization of view with current state
   */
  forceSyncWithState() {
    const currentMode = appState.getViewMode();
    console.log(
      `[ViewControllerManager] 🔄 Force syncing with state: ${currentMode}`
    );
    console.log(
      `[ViewControllerManager] 📊 Current system state before sync:`,
      {
        appStateMode: appState.getViewMode(),
        hasBuilding: !!this.currentBuilding,
        venueId: this.currentVenueId,
        activeBuildingsCount: appState.getAllActiveBuildings().size,
      }
    );

    this.refreshBuildingReferences();
    this.handleViewModeChange(currentMode);
  }

  /**
   * Get current building context for external use
   */
  getCurrentBuildingContext() {
    return {
      building: this.currentBuilding,
      venueId: this.currentVenueId,
      hasContext: !!(this.currentBuilding && this.currentVenueId),
    };
  }

  /**
   * Get current building name for notifications
   */
  getBuildingName() {
    if (!this.currentVenueId) return "";

    // Try to get building name from venue data
    const venue = appState.findVenueById(this.currentVenueId);
    if (venue && venue.properties && venue.properties.name) {
      return venue.properties.name;
    }

    // Fallback to venue ID
    return this.currentVenueId;
  }

  /**
   * Cleanup method
   */
  destroy() {
    // Clean up state listeners
    this.stateCleanups.forEach((cleanup) => cleanup());
    this.stateCleanups = [];

    console.log("[ViewControllerManager] Destroyed and cleaned up");
  }
}

// Export for global access during development
if (typeof window !== "undefined") {
  window.ViewControllerManager = ViewControllerManager;
}
