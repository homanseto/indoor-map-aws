/**
 * Centralized Application State Management
 *
 * This module provides a single source of truth for all shared application state.
 * Designed for 3D Indoor Map Viewer with support for:
 * - Building and network management
 * - Real-time collaboration preparation
 * - Undo/redo functionality
 * - Automatic state persistence
 * - Event-driven reactive updates
 *
 * @version 1.0.0
 * @author Indoor Map Viewer Team
 */

/**
 * Application State Manager Class
 * Implements singleton pattern with event-driven updates
 */
class AppStateManager {
  constructor() {
    // Core Cesium references
    this.viewer = null;
    this.mapSidebar = null;

    // Venue and building data
    this.venueGeoJson = null;
    this.activeBuildings = new Map(); // venueId -> BuildingIndoor instance
    this.activeNetworks = new Map(); // venueId -> IndoorNetwork instance
    this.activeMTRStations = new Map(); // venueId -> MTRIndoor instance

    // UI state management
    this.lastActiveVenueId = null;
    this.currentViewMode = "3D"; // '2D' | '3D'
    this.selectedLevelId = "ALL";
    this.isProcessingClick = false;

    // Visibility tracking
    this.hiddenVenuePolygons = new Set();
    this.hiddenMTRPolygons = new Set();

    // Caching and performance
    this.buildingNetworkCache = new Map(); // buildingName -> networkData
    this.activeBuildingNetworks = new Map(); // venueId -> {dataSource, data, loading}

    // Event system for reactive updates
    this.subscribers = new Map();

    // History for undo/redo functionality
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = 50;

    // Persistence settings
    this.persistenceEnabled = true;
    this.persistenceKey = "indoorMapViewerState";

    // unit labels
    this.unitLabelState = { active: false, venueId: null, levelId: null };

    // Initialize
    this.init();
  }

  /**
   * Initialize the state manager
   */
  init() {
    // Load persisted state if available
    if (this.persistenceEnabled) {
      this.loadPersistedState();
    }

    // Setup auto-save for state changes
    this.setupAutoPersistence();

    console.log("[AppState] Centralized state manager initialized");
  }

  // ===========================================
  // EVENT SYSTEM FOR REACTIVE UPDATES
  // ===========================================

  /**
   * Subscribe to state change events
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);

    // Return unsubscribe function
    return () => this.subscribers.get(event).delete(callback);
  }

  /**
   * Emit state change event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(
            `[AppState] Error in event callback for ${event}:`,
            error
          );
        }
      });
    }
  }

  // ===========================================
  // CORE CESIUM REFERENCES
  // ===========================================

  /**
   * Set Cesium viewer instance
   * @param {Cesium.Viewer} viewer
   */
  setViewer(viewer) {
    const oldViewer = this.viewer;
    this.viewer = viewer;
    this.emit("viewerChanged", { oldViewer, newViewer: viewer });
    console.log("[AppState] Cesium viewer reference set");
  }

  /**
   * Get Cesium viewer instance
   * @returns {Cesium.Viewer|null}
   */
  getViewer() {
    return this.viewer;
  }

  /**
   * Set current view mode
   * @param {'2D'|'3D'} mode
   */
  setViewMode(mode) {
    if (!["2D", "3D"].includes(mode)) return;

    const oldMode = this.currentViewMode;
    if (oldMode === mode) return;

    this.currentViewMode = mode;

    const viewer = this.getViewer();
    if (viewer) {
      const scene = viewer.scene;
      if (mode === "2D" && scene.mode !== Cesium.SceneMode.SCENE2D) {
        scene.morphTo2D(0); // instantaneous morph
      } else if (mode === "3D" && scene.mode !== Cesium.SceneMode.SCENE3D) {
        scene.morphTo3D(0);
      }
    }

    this.emit("viewModeChanged", { oldMode, newMode: mode });
    this.saveState("setViewMode", { mode });
  }

  /**
   * Get current view mode
   * @returns {'2D'|'3D'}
   */
  getViewMode() {
    return this.currentViewMode;
  }

  getUnitLabelState() {
    return { ...this.unitLabelState };
  }

  setUnitLabelState(nextState) {
    const previous = this.unitLabelState;
    const merged = {
      active: false,
      venueId: null,
      levelId: null,
      ...nextState,
    };

    const changed =
      previous.active !== merged.active ||
      previous.venueId !== merged.venueId ||
      previous.levelId !== merged.levelId;

    if (!changed) return;

    this.unitLabelState = merged;
    this.emit("unitLabelStateChanged", { previous, current: merged });
  }

  resetUnitLabelState() {
    this.setUnitLabelState({ active: false, venueId: null, levelId: null });
  }

  getSelectedLevel() {
    return this.selectedLevelId;
  }

  // public/js/shared/AppState.js
  setSelectedLevel(levelId) {
    if (this.selectedLevelId === levelId) return;

    const previous = this.selectedLevelId;
    this.selectedLevelId = levelId;

    this.emit("selectedLevelChanged", { previous, current: levelId });
  }

  /**
   * Set map sidebar instance
   * @param {Sidebar} sidebar
   */
  setMapSidebar(sidebar) {
    const oldSidebar = this.mapSidebar;
    this.mapSidebar = sidebar;
    this.emit("sidebarChanged", { oldSidebar, newSidebar: sidebar });
  }

  /**
   * Get map sidebar instance
   * @returns {Sidebar|null}
   */
  getMapSidebar() {
    return this.mapSidebar;
  }

  // ===========================================
  // VENUE DATA MANAGEMENT
  // ===========================================

  /**
   * Set venue GeoJSON data
   * @param {Object} venueGeoJson
   */
  setVenueGeoJson(venueGeoJson) {
    this.venueGeoJson = venueGeoJson;
    this.emit("venueDataChanged", venueGeoJson);
    this.saveState("setVenueGeoJson", { venueGeoJson });
  }

  /**
   * Get venue GeoJSON data
   * @returns {Object|null}
   */
  getVenueGeoJson() {
    return this.venueGeoJson;
  }

  /**
   * Find venue by ID
   * @param {string} venueId
   * @returns {Object|null}
   */
  findVenueById(venueId) {
    if (!this.venueGeoJson || !this.venueGeoJson.features) {
      return null;
    }
    return this.venueGeoJson.features.find((feature) => feature.id === venueId);
  }

  // ===========================================
  // BUILDING MANAGEMENT
  // ===========================================

  /**
   * Add or update active building
   * @param {string} venueId
   * @param {BuildingIndoor} building
   */
  setActiveBuilding(venueId, building) {
    const wasActive = this.activeBuildings.has(venueId);
    this.activeBuildings.set(venueId, building);

    this.emit("buildingAdded", { venueId, building, wasActive });
    this.saveState("setActiveBuilding", { venueId, buildingExists: true });

    console.log(
      `[AppState] Building ${venueId} ${wasActive ? "updated" : "added"}`
    );
  }

  /**
   * Remove active building
   * @param {string} venueId
   */
  removeActiveBuilding(venueId) {
    const building = this.activeBuildings.get(venueId);
    if (building) {
      this.activeBuildings.delete(venueId);
      this.emit("buildingRemoved", { venueId, building });
      this.saveState("removeActiveBuilding", { venueId });

      // Clean up if this was the last active venue
      if (this.lastActiveVenueId === venueId) {
        this.setLastActiveVenueId(null);
      }

      console.log(`[AppState] Building ${venueId} removed`);
    }
  }

  /**
   * Get active building by venue ID
   * @param {string} venueId
   * @returns {BuildingIndoor|null}
   */
  getActiveBuilding(venueId) {
    return this.activeBuildings.get(venueId) || null;
  }

  /**
   * Get all active buildings
   * @returns {Map<string, BuildingIndoor>}
   */
  getAllActiveBuildings() {
    return new Map(this.activeBuildings);
  }

  /**
   * Check if building is active
   * @param {string} venueId
   * @returns {boolean}
   */
  isBuildingActive(venueId) {
    return this.activeBuildings.has(venueId);
  }

  // ===========================================
  // NETWORK MANAGEMENT
  // ===========================================

  /**
   * Set active network
   * @param {string} venueId
   * @param {IndoorNetwork} network
   */
  setActiveNetwork(venueId, network) {
    const wasActive = this.activeNetworks.has(venueId);
    this.activeNetworks.set(venueId, network);

    this.emit("networkAdded", { venueId, network, wasActive });
    this.saveState("setActiveNetwork", { venueId, networkExists: true });
  }

  /**
   * Remove active network
   * @param {string} venueId
   */
  removeActiveNetwork(venueId) {
    const network = this.activeNetworks.get(venueId);
    if (network) {
      this.activeNetworks.delete(venueId);
      this.emit("networkRemoved", { venueId, network });
      this.saveState("removeActiveNetwork", { venueId });
    }
  }

  /**
   * Get active network
   * @param {string} venueId
   * @returns {IndoorNetwork|null}
   */
  getActiveNetwork(venueId) {
    return this.activeNetworks.get(venueId) || null;
  }

  /**
   * Get all active networks
   * @returns {Map<string, IndoorNetwork>}
   */
  getAllActiveNetworks() {
    return new Map(this.activeNetworks);
  }

  // ===========================================
  // UI STATE MANAGEMENT
  // ===========================================

  /**
   * Set last active venue ID
   * @param {string|null} venueId
   */
  setLastActiveVenueId(venueId) {
    const oldVenueId = this.lastActiveVenueId;
    this.lastActiveVenueId = venueId;

    this.emit("lastActiveVenueChanged", { oldVenueId, newVenueId: venueId });
    this.saveState("setLastActiveVenueId", { venueId });
  }

  /**
   * Get last active venue ID
   * @returns {string|null}
   */
  getLastActiveVenueId() {
    return this.lastActiveVenueId;
  }

  /**
   * Check if in 2D mode
   * @returns {boolean}
   */
  isIn2DMode() {
    return this.currentViewMode === "2D";
  }

  /**
   * Set processing click flag
   * @param {boolean} isProcessing
   */
  setProcessingClick(isProcessing) {
    this.isProcessingClick = isProcessing;
    this.emit("processingClickChanged", isProcessing);
  }

  /**
   * Check if click is being processed
   * @returns {boolean}
   */
  isClickProcessing() {
    return this.isProcessingClick;
  }

  // ===========================================
  // VISIBILITY TRACKING
  // ===========================================

  /**
   * Add hidden venue polygon
   * @param {string} venueId
   */
  addHiddenVenuePolygon(venueId) {
    this.hiddenVenuePolygons.add(venueId);
    this.emit("venuePolygonHidden", venueId);
    this.saveState("addHiddenVenuePolygon", { venueId });
  }

  /**
   * Remove hidden venue polygon
   * @param {string} venueId
   */
  removeHiddenVenuePolygon(venueId) {
    this.hiddenVenuePolygons.delete(venueId);
    this.emit("venuePolygonShown", venueId);
    this.saveState("removeHiddenVenuePolygon", { venueId });
  }

  /**
   * Check if venue polygon is hidden
   * @param {string} venueId
   * @returns {boolean}
   */
  isVenuePolygonHidden(venueId) {
    return this.hiddenVenuePolygons.has(venueId);
  }

  // ===========================================
  // CACHING SYSTEM
  // ===========================================

  /**
   * Set building network cache
   * @param {string} buildingName
   * @param {Object} networkData
   */
  setBuildingNetworkCache(buildingName, networkData) {
    this.buildingNetworkCache.set(buildingName, networkData);
    this.emit("networkCacheUpdated", { buildingName, networkData });
  }

  /**
   * Get building network cache
   * @param {string} buildingName
   * @returns {Object|null}
   */
  getBuildingNetworkCache(buildingName) {
    return this.buildingNetworkCache.get(buildingName) || null;
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.buildingNetworkCache.clear();
    this.activeBuildingNetworks.clear();
    this.emit("cachesCleared");
  }

  // ===========================================
  // BATCH OPERATIONS
  // ===========================================

  /**
   * Clear all active buildings and networks
   */
  clearAllActive() {
    const clearedBuildings = new Map(this.activeBuildings);
    const clearedNetworks = new Map(this.activeNetworks);

    this.activeBuildings.clear();
    this.activeNetworks.clear();
    this.activeMTRStations.clear();
    this.setLastActiveVenueId(null);

    this.emit("allActiveCleared", { clearedBuildings, clearedNetworks });
    this.saveState("clearAllActive", {});

    console.log("[AppState] All active buildings and networks cleared");
  }

  /**
   * Get application status summary
   * @returns {Object}
   */
  getStatus() {
    return {
      hasViewer: !!this.viewer,
      hasSidebar: !!this.mapSidebar,
      hasVenueData: !!this.venueGeoJson,
      activeBuildingsCount: this.activeBuildings.size,
      activeNetworksCount: this.activeNetworks.size,
      lastActiveVenue: this.lastActiveVenueId,
      currentViewMode: this.currentViewMode,
      hiddenVenueCount: this.hiddenVenuePolygons.size,
      cacheSize: this.buildingNetworkCache.size,
      isProcessingClick: this.isProcessingClick,
    };
  }

  // ===========================================
  // UNDO/REDO FUNCTIONALITY
  // ===========================================

  /**
   * Save state to history for undo/redo
   * @private
   */
  saveState(action, params) {
    // Don't save during undo/redo operations
    if (this._undoRedoInProgress) return;

    const stateSnapshot = {
      timestamp: Date.now(),
      action,
      params,
      state: {
        lastActiveVenueId: this.lastActiveVenueId,
        currentViewMode: this.currentViewMode,
        selectedLevelId: this.selectedLevelId,
        activeBuildings: Array.from(this.activeBuildings.keys()),
        activeNetworks: Array.from(this.activeNetworks.keys()),
        hiddenVenuePolygons: Array.from(this.hiddenVenuePolygons),
      },
    };

    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new state
    this.history.push(stateSnapshot);
    this.historyIndex++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
      this.historyIndex = this.history.length - 1;
    }

    this.emit("historyChanged", {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      currentIndex: this.historyIndex,
      totalStates: this.history.length,
    });
  }

  /**
   * Check if undo is available
   * @returns {boolean}
   */
  canUndo() {
    return this.historyIndex > 0;
  }

  /**
   * Check if redo is available
   * @returns {boolean}
   */
  canRedo() {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * Undo last action
   */
  undo() {
    if (!this.canUndo()) return;

    this._undoRedoInProgress = true;
    this.historyIndex--;

    const targetState = this.history[this.historyIndex];
    this.restoreState(targetState.state);

    this._undoRedoInProgress = false;

    this.emit("stateRestored", { action: "undo", state: targetState });
    console.log("[AppState] Undo performed:", targetState.action);
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (!this.canRedo()) return;

    this._undoRedoInProgress = true;
    this.historyIndex++;

    const targetState = this.history[this.historyIndex];
    this.restoreState(targetState.state);

    this._undoRedoInProgress = false;

    this.emit("stateRestored", { action: "redo", state: targetState });
    console.log("[AppState] Redo performed:", targetState.action);
  }

  /**
   * Restore state from snapshot
   * @private
   */
  restoreState(stateSnapshot) {
    // This is a simplified restoration - in a full implementation,
    // you'd need to handle complex object restoration
    this.lastActiveVenueId = stateSnapshot.lastActiveVenueId;
    this.currentViewMode = stateSnapshot.currentViewMode;
    this.selectedLevelId = stateSnapshot.selectedLevelId;

    // Note: Building/network instances can't be easily restored from snapshots
    // In a production app, you'd need to implement proper serialization/deserialization

    this.emit("stateRestored", stateSnapshot);
  }

  // ===========================================
  // PERSISTENCE
  // ===========================================

  /**
   * Setup automatic persistence
   * @private
   */
  setupAutoPersistence() {
    if (!this.persistenceEnabled) return;

    // Save state on key changes
    const persistenceEvents = [
      "lastActiveVenueChanged",
      "viewModeChanged",
      "venuePolygonHidden",
      "venuePolygonShown",
    ];

    persistenceEvents.forEach((event) => {
      this.subscribe(event, () => {
        this.persistState();
      });
    });

    // Auto-save every 30 seconds
    setInterval(() => {
      this.persistState();
    }, 30000);
  }

  /**
   * Persist current state to localStorage
   */
  persistState() {
    if (!this.persistenceEnabled) return;

    try {
      const persistableState = {
        lastActiveVenueId: this.lastActiveVenueId,
        currentViewMode: this.currentViewMode,
        selectedLevelId: this.selectedLevelId,
        hiddenVenuePolygons: Array.from(this.hiddenVenuePolygons),
        hiddenMTRPolygons: Array.from(this.hiddenMTRPolygons),
        timestamp: Date.now(),
      };

      localStorage.setItem(
        this.persistenceKey,
        JSON.stringify(persistableState)
      );
    } catch (error) {
      console.warn("[AppState] Failed to persist state:", error);
    }
  }

  /**
   * Load persisted state from localStorage
   * @private
   */
  loadPersistedState() {
    try {
      const persistedData = localStorage.getItem(this.persistenceKey);
      if (!persistedData) return;

      const state = JSON.parse(persistedData);

      // Check if state is not too old (7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem(this.persistenceKey);
        return;
      }

      // Restore state
      this.lastActiveVenueId = state.lastActiveVenueId || null;
      this.currentViewMode = state.currentViewMode || "3D";
      this.selectedLevelId = state.selectedLevelId || "ALL";

      if (state.hiddenVenuePolygons) {
        this.hiddenVenuePolygons = new Set(state.hiddenVenuePolygons);
      }
      if (state.hiddenMTRPolygons) {
        this.hiddenMTRPolygons = new Set(state.hiddenMTRPolygons);
      }

      console.log("[AppState] Persisted state loaded successfully");
    } catch (error) {
      console.warn("[AppState] Failed to load persisted state:", error);
      localStorage.removeItem(this.persistenceKey);
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState() {
    localStorage.removeItem(this.persistenceKey);
    console.log("[AppState] Persisted state cleared");
  }

  // ===========================================
  // DEBUGGING AND DEVELOPMENT
  // ===========================================

  /**
   * Get debug information
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      status: this.getStatus(),
      history: {
        length: this.history.length,
        currentIndex: this.historyIndex,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      },
      subscribers: Object.fromEntries(
        Array.from(this.subscribers.entries()).map(([event, callbacks]) => [
          event,
          callbacks.size,
        ])
      ),
      persistence: {
        enabled: this.persistenceEnabled,
        key: this.persistenceKey,
        hasPersistedData: !!localStorage.getItem(this.persistenceKey),
      },
    };
  }

  /**
   * Export current state for debugging
   * @returns {Object}
   */
  exportState() {
    return {
      ...this.getStatus(),
      venueData: !!this.venueGeoJson,
      debugInfo: this.getDebugInfo(),
    };
  }
}

// Export singleton instance
export const appState = new AppStateManager();

// Export class for testing or multiple instances
export { AppStateManager };

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.appState = appState;
}
