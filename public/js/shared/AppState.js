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
    // Level and display mode selection
    this.selectedLevelId = "ALL";
    this.kickMode = false; // false: only selected level, true: show with lower levels
    this.isProcessingClick = false;

    // 3D Tiles Management
    this.activeTilesets = new Map(); // tilesetId → tileset instance mapping
    this.tilesetConfigs = new Map(); // tilesetId → configuration object
    this.tilesetStates = new Map(); // tilesetId → { visible, opacity, loading, loaded }

    // 3D Tiles default configurations
    this.defaultTilesetConfigs = {
      threeDTiles: {
        id: "threeDTiles",
        name: "3D Buildings",
        url: "https://data.map.gov.hk/api/3d-data/3dtiles/f2/tileset.json?key=3967f8f365694e0798af3e7678509421",
        defaultOpacity: 0.4,
        defaultVisible: true,
        style: {
          color: {
            evaluateColor: function (feature, result) {
              return Cesium.Color.clone(
                Cesium.Color.WHITE.withAlpha(0.4),
                result
              );
            },
          },
        },
      },
      // PNTiles: {
      //   id: 'PNTiles',
      //   name: '3D Pedestrian Network',
      //   url: 'http://3dm/dev/bR5B7mxkmjhRhTTroMCo/storage/3dpn/3DPN_v1.0/tileset.json',
      //   defaultOpacity: 1.0,
      //   defaultVisible: true,
      //   style: {
      //     show: true,
      //     color: "color('orange')"
      //   }
      // },
      // indoorMTRTiles: {
      //   id: 'indoorMTRTiles',
      //   name: 'Indoor MTR Network',
      //   url: 'http://3dmapweb3:8097/b3dm/indoor_network_mtr_3/output/tileset.json',
      //   defaultOpacity: 1.0,
      //   defaultVisible: true,
      //   style: {
      //     color: "color('black')"
      //   }
      // },
      // hikingTiles: {
      //   id: 'hikingTiles',
      //   name: 'Hiking Routes',
      //   url: 'http://3dmapweb3:8097/b3dm/hiking_route_2/output/tileset.json',
      //   defaultOpacity: 1.0,
      //   defaultVisible: true,
      //   style: {
      //     color: {
      //       evaluateColor: function (feature, result) {
      //         return Cesium.Color.fromBytes(255, 0, 255, 255, result);
      //       }
      //     }
      //   }
      // }
    };

    // Initialize default tileset states
    Object.values(this.defaultTilesetConfigs).forEach((config) => {
      this.tilesetStates.set(config.id, {
        visible: config.defaultVisible,
        opacity: config.defaultOpacity,
        loading: false,
        loaded: false,
        error: null,
      });
      this.tilesetConfigs.set(config.id, { ...config });
    });

    // Visibility tracking
    this.networkVisible = true; // Global network visibility state
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

    // // Initialize
    // this.init();
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
   * Get kick mode state
   * @returns {boolean}
   */
  getKickMode() {
    return this.kickMode;
  }

  /**
   * Set kick mode state
   * @param {boolean} enabled - true: show selected level with lower levels, false: only selected level
   */
  setKickMode(enabled) {
    if (this.kickMode === enabled) return;

    const previous = this.kickMode;
    this.kickMode = enabled;

    this.emit("kickModeChanged", { previous, current: enabled });

    // // Save to persistence
    // if (this.persistenceEnabled) {
    //   this.persistState();
    // }
  }

  /**
   * Get network visibility state
   * @returns {boolean}
   */
  getNetworkVisible() {
    return this.networkVisible;
  }

  /**
   * Set network visibility state
   * @param {boolean} visible - true: show networks, false: hide networks
   */
  setNetworkVisible(visible) {
    if (this.networkVisible === visible) return;

    const previous = this.networkVisible;
    this.networkVisible = visible;

    this.emit("networkVisibilityChanged", { previous, current: visible });

    // // Save to persistence
    // if (this.persistenceEnabled) {
    //   this.persistState();
    // }
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
  // 3D TILES MANAGEMENT
  // ===========================================

  /**
   * Set active tileset
   * @param {string} tilesetId
   * @param {Cesium.Cesium3DTileset} tileset
   */
  setActiveTileset(tilesetId, tileset) {
    const oldTileset = this.activeTilesets.get(tilesetId);
    this.activeTilesets.set(tilesetId, tileset);

    // Update loaded state
    this.setTilesetLoadingState(tilesetId, false, false);

    this.emit("tilesetAdded", {
      tilesetId,
      tileset,
      oldTileset,
      config: this.tilesetConfigs.get(tilesetId),
    });
    console.log(`[AppState] Tileset ${tilesetId} added and activated`);
  }

  /**
   * Remove active tileset
   * @param {string} tilesetId
   */
  removeActiveTileset(tilesetId) {
    const tileset = this.activeTilesets.get(tilesetId);
    if (tileset) {
      this.activeTilesets.delete(tilesetId);

      // Reset state
      const config = this.tilesetConfigs.get(tilesetId);
      if (config) {
        this.tilesetStates.set(tilesetId, {
          visible: config.defaultVisible,
          opacity: config.defaultOpacity,
          loading: false,
          loaded: false,
          error: null,
        });
      }

      this.emit("tilesetRemoved", { tilesetId, tileset });
      console.log(`[AppState] Tileset ${tilesetId} removed`);
    }
  }

  /**
   * Get active tileset
   * @param {string} tilesetId
   * @returns {Cesium.Cesium3DTileset|null}
   */
  getActiveTileset(tilesetId) {
    return this.activeTilesets.get(tilesetId) || null;
  }

  /**
   * Get all active tilesets
   * @returns {Map<string, Cesium.Cesium3DTileset>}
   */
  getAllActiveTilesets() {
    return this.activeTilesets;
  }

  /**
   * Check if tileset is active
   * @param {string} tilesetId
   * @returns {boolean}
   */
  isTilesetActive(tilesetId) {
    return this.activeTilesets.has(tilesetId);
  }

  /**
   * Set tileset visibility
   * @param {string} tilesetId
   * @param {boolean} visible
   */
  setTilesetVisible(tilesetId, visible) {
    const currentState = this.tilesetStates.get(tilesetId);
    if (!currentState || currentState.visible === visible) return;

    const oldState = { ...currentState };
    currentState.visible = visible;

    this.emit("tilesetVisibilityChanged", {
      tilesetId,
      oldVisible: oldState.visible,
      newVisible: visible,
      state: currentState,
    });
    this.saveState("setTilesetVisible", { tilesetId, visible });
  }

  /**
   * Get tileset visibility
   * @param {string} tilesetId
   * @returns {boolean}
   */
  getTilesetVisible(tilesetId) {
    const state = this.tilesetStates.get(tilesetId);
    return state ? state.visible : false;
  }

  /**
   * Set tileset opacity
   * @param {string} tilesetId
   * @param {number} opacity - Value between 0.0 and 1.0
   */
  setTilesetOpacity(tilesetId, opacity) {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    const currentState = this.tilesetStates.get(tilesetId);
    if (!currentState || currentState.opacity === clampedOpacity) return;

    const oldOpacity = currentState.opacity;
    currentState.opacity = clampedOpacity;

    this.emit("tilesetOpacityChanged", {
      tilesetId,
      oldOpacity,
      newOpacity: clampedOpacity,
      state: currentState,
    });
    this.saveState("setTilesetOpacity", { tilesetId, opacity: clampedOpacity });
  }

  /**
   * Get tileset opacity
   * @param {string} tilesetId
   * @returns {number}
   */
  getTilesetOpacity(tilesetId) {
    const state = this.tilesetStates.get(tilesetId);
    return state ? state.opacity : 1.0;
  }

  /**
   * Set tileset loading state
   * @param {string} tilesetId
   * @param {boolean} loading
   * @param {boolean} loaded
   * @param {string|null} error
   */
  setTilesetLoadingState(tilesetId, loading, loaded, error = null) {
    const currentState = this.tilesetStates.get(tilesetId);
    if (!currentState) return;

    const oldState = { ...currentState };
    currentState.loading = loading;
    currentState.loaded = loaded;
    currentState.error = error;

    this.emit("tilesetLoadingStateChanged", {
      tilesetId,
      oldState,
      newState: currentState,
    });
  }

  /**
   * Get tileset state
   * @param {string} tilesetId
   * @returns {Object|null}
   */
  getTilesetState(tilesetId) {
    const state = this.tilesetStates.get(tilesetId);
    return state ? { ...state } : null;
  }

  /**
   * Get tileset configuration
   * @param {string} tilesetId
   * @returns {Object|null}
   */
  getTilesetConfig(tilesetId) {
    return this.tilesetConfigs.get(tilesetId) || null;
  }

  /**
   * Get all tileset configurations
   * @returns {Object}
   */
  getAllTilesetConfigs() {
    const configs = {};
    this.tilesetConfigs.forEach((config, id) => {
      configs[id] = { ...config };
    });
    return configs;
  }

  /**
   * Get all tileset states
   * @returns {Object}
   */
  getAllTilesetStates() {
    const states = {};
    this.tilesetStates.forEach((state, id) => {
      states[id] = { ...state };
    });
    return states;
  }

  /**
   * Clear all active tilesets
   */
  clearAllTilesets() {
    const tilesetIds = Array.from(this.activeTilesets.keys());
    tilesetIds.forEach((id) => this.removeActiveTileset(id));

    this.emit("allTilesetsCleared", { clearedIds: tilesetIds });
    console.log("[AppState] All tilesets cleared");
  }

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
  // 3D Tile  MANAGEMENT
  // ===========================================

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
        kickMode: this.kickMode,
        networkVisible: this.networkVisible,
        hiddenVenuePolygons: Array.from(this.hiddenVenuePolygons),
        hiddenMTRPolygons: Array.from(this.hiddenMTRPolygons),
        tilesetStates: Object.fromEntries(this.tilesetStates),
        tilesetConfigs: Object.fromEntries(this.tilesetConfigs),
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
      this.kickMode = state.kickMode || false;
      this.networkVisible =
        state.networkVisible !== undefined ? state.networkVisible : true;

      if (state.hiddenVenuePolygons) {
        this.hiddenVenuePolygons = new Set(state.hiddenVenuePolygons);
      }
      if (state.hiddenMTRPolygons) {
        this.hiddenMTRPolygons = new Set(state.hiddenMTRPolygons);
      }

      if (state.tilesetStates) {
        this.tilesetStates = new Map(Object.entries(state.tilesetStates));
      }
      if (state.tilesetConfigs) {
        this.tilesetConfigs = new Map(Object.entries(state.tilesetConfigs));
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
