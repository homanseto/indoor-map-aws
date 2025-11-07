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
    this.viewManager2D = null;
    this.sidebar = null;

    // Building context
    this.currentBuilding = null;
    this.currentVenueId = null;

    // State hook cleanup functions
    this.stateCleanups = [];

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

  /**
   * Register view components with the controller
   */
  registerViewManager2D(viewManager2D) {
    this.viewManager2D = viewManager2D;
    console.log("[ViewControllerManager] ViewManager2D registered");
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
    console.log(
      `[ViewControllerManager] 🔄 View mode change requested: ${newViewMode}`
    );
    console.log(`[ViewControllerManager] 📊 Current state before change:`, {
      hasViewManager2D: !!this.viewManager2D,
      currentBuilding: !!this.currentBuilding,
      currentVenueId: this.currentVenueId,
      appStateMode: appState.getViewMode(),
      viewManager2DMode: this.viewManager2D
        ? this.viewManager2D.isIn2DMode()
        : "N/A",
    });

    if (!this.viewManager2D) {
      console.error(
        "[ViewControllerManager] ❌ ViewManager2D not registered yet - cannot switch views"
      );
      return;
    }

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
      // Execute 2D mode transition
      this.enter2DMode();
    } else if (newViewMode === "3D") {
      console.log("[ViewControllerManager] ✅ Exiting to 3D mode");
      // Execute 3D mode transition
      this.exit2DMode();
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
   * Execute 2D mode entry
   */
  async enter2DMode() {
    console.log("[ViewControllerManager] 🚀 Starting 2D mode entry process...");

    if (!this.viewManager2D || !this.currentBuilding || !this.currentVenueId) {
      console.error(
        "[ViewControllerManager] ❌ Cannot enter 2D mode: missing dependencies",
        {
          hasViewManager2D: !!this.viewManager2D,
          hasCurrentBuilding: !!this.currentBuilding,
          hasCurrentVenueId: !!this.currentVenueId,
        }
      );
      //   notificationSystem.buildingRequired();
      return;
    }

    // Show loading notification
    // const loadingId = notificationSystem.viewModeSwitchLoading("2D");

    try {
      console.log(
        "[ViewControllerManager] 🎬 Calling viewManager2D.enter2DMode..."
      );
      await this.viewManager2D.enter2DMode(
        this.currentBuilding,
        this.currentVenueId
      );

      console.log(
        "[ViewControllerManager] ✅ ViewManager2D.enter2DMode completed"
      );
      console.log("[ViewControllerManager] 🔍 Post-transition state:", {
        appStateMode: appState.getViewMode(),
        viewManager2DMode: this.viewManager2D.isIn2DMode(),
      });

      //   // Update loading notification to success
      //   notificationSystem.hide(loadingId);
      //   notificationSystem.viewModeSwitch("2D", this.getBuildingName());
    } catch (error) {
      console.error(
        "[ViewControllerManager] ❌ Failed to enter 2D mode:",
        error
      );

      //   // Update loading notification to error
      //   notificationSystem.hide(loadingId);
      //   notificationSystem.viewModeSwitchError("2D", error.message);

      // Revert state on error
      appState.setViewMode("3D");
    }
  }

  /**
   * Execute 3D mode entry
   */
  async exit2DMode() {
    if (!this.viewManager2D) {
      console.error(
        "[ViewControllerManager] Cannot exit 2D mode: ViewManager2D not available"
      );
      //   notificationSystem.viewModeSwitchError(
      //     "3D",
      //     "View manager not available"
      //   );
      return;
    }

    // // Show loading notification
    // const loadingId = notificationSystem.viewModeSwitchLoading("3D");

    try {
      console.log("[ViewControllerManager] Exiting 2D mode...");
      await this.viewManager2D.exit2DMode();
      console.log("[ViewControllerManager] Successfully exited 2D mode");

      //   // Update loading notification to success
      //   notificationSystem.hide(loadingId);
      //   notificationSystem.viewModeSwitch("3D", this.getBuildingName());
    } catch (error) {
      console.error("[ViewControllerManager] Failed to exit 2D mode:", error);

      //   // Update loading notification to error
      //   notificationSystem.hide(loadingId);
      //   notificationSystem.viewModeSwitchError("3D", error.message);
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
        viewManager2DMode: this.viewManager2D
          ? this.viewManager2D.isIn2DMode()
          : "N/A",
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
