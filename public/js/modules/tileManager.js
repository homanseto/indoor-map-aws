import { appState } from "../shared/AppState.js";

/**
 * TilesManager - 3D Tiles Management Module
 *
 * Manages 3D Tiles loading, styling, and state integration
 * Follows the same patterns as BuildingIndoor and IndoorNetwork modules
 *
 * Features:
 * - SSOT integration with AppState
 * - Reactive updates via state events
 * - Multiple tileset support
 * - Loading state management
 * - Error handling and retry logic
 */
export class TilesManager {
  constructor(viewer) {
    this.viewer = viewer;
    this.stateCleanups = [];

    // Track loaded tilesets (tilesetId -> Cesium.Cesium3DTileset)
    this.loadedTilesets = new Map();

    // Loading promises to prevent duplicate loads
    this.loadingPromises = new Map();

    this.init();
  }

  /**
   * Initialize the tiles manager with state hooks
   */
  init() {
    this.setupStateManagement();
    console.log("[TilesManager] Initialized with state integration");
  }

  /**
   * Setup state management hooks for reactive updates
   */
  setupStateManagement() {
    // Subscribe to tileset visibility changes
    const visibilityCleanup = appState.subscribe(
      "tilesetVisibilityChanged",
      (data) => {
        this.handleVisibilityChange(data.tilesetId, data.newVisible);
      }
    );
    this.stateCleanups.push(visibilityCleanup);

    // Subscribe to tileset opacity changes
    const opacityCleanup = appState.subscribe(
      "tilesetOpacityChanged",
      (data) => {
        this.handleOpacityChange(data.tilesetId, data.newOpacity);
      }
    );
    this.stateCleanups.push(opacityCleanup);

    // Subscribe to tileset removal
    const removalCleanup = appState.subscribe("tilesetRemoved", (data) => {
      this.handleTilesetRemoval(data.tilesetId);
    });
    this.stateCleanups.push(removalCleanup);

    console.log("[TilesManager] State management hooks established");
  }

  /**
   * Load a tileset by ID
   * @param {string} tilesetId - The tileset identifier
   * @returns {Promise<Cesium.Cesium3DTileset>}
   */
  async loadTileset(tilesetId) {
    // Prevent duplicate loading
    if (this.loadingPromises.has(tilesetId)) {
      console.log(
        `[TilesManager] ${tilesetId} is already loading, returning existing promise`
      );
      return this.loadingPromises.get(tilesetId);
    }

    // Check if already loaded
    if (this.loadedTilesets.has(tilesetId)) {
      console.log(`[TilesManager] ${tilesetId} is already loaded`);
      return this.loadedTilesets.get(tilesetId);
    }

    const config = appState.getTilesetConfig(tilesetId);
    if (!config) {
      throw new Error(
        `[TilesManager] No configuration found for tileset: ${tilesetId}`
      );
    }

    console.log(`[TilesManager] Loading tileset: ${tilesetId}`);

    // Set loading state
    appState.setTilesetLoadingState(tilesetId, true, false);

    const loadPromise = this.performTilesetLoad(tilesetId, config);
    this.loadingPromises.set(tilesetId, loadPromise);

    try {
      const tileset = await loadPromise;

      // Store the loaded tileset
      this.loadedTilesets.set(tilesetId, tileset);

      // Register with AppState
      appState.setActiveTileset(tilesetId, tileset);

      // Apply initial state
      this.applyTilesetState(tilesetId, tileset);

      // Set loaded state
      appState.setTilesetLoadingState(tilesetId, false, true);

      console.log(`[TilesManager] Successfully loaded tileset: ${tilesetId}`);
      return tileset;
    } catch (error) {
      console.error(
        `[TilesManager] Failed to load tileset ${tilesetId}:`,
        error
      );

      // Set error state
      appState.setTilesetLoadingState(tilesetId, false, false, error.message);

      throw error;
    } finally {
      this.loadingPromises.delete(tilesetId);
    }
  }

  /**
   * Perform the actual tileset loading
   * @param {string} tilesetId
   * @param {Object} config
   * @returns {Promise<Cesium.Cesium3DTileset>}
   * @private
   */
  async performTilesetLoad(tilesetId, config) {
    try {
      // Create tileset from URL
      const tileset = await Cesium.Cesium3DTileset.fromUrl(config.url);

      // Apply initial styling
      if (config.style) {
        tileset.style = new Cesium.Cesium3DTileStyle(config.style);
      }

      // Add to viewer
      this.viewer.scene.primitives.add(tileset);

      // Handle specific tileset configurations
      if (tilesetId === "hikingTiles") {
        tileset.enableCollision = false;
        this.viewer.scene.primitives.raiseToTop(tileset);
      }

      return tileset;
    } catch (error) {
      throw new Error(
        `Failed to load tileset from ${config.url}: ${error.message}`
      );
    }
  }

  /**
   * Apply current AppState to a tileset
   * @param {string} tilesetId
   * @param {Cesium.Cesium3DTileset} tileset
   */
  applyTilesetState(tilesetId, tileset) {
    const state = appState.getTilesetState(tilesetId);
    if (!state) return;

    // Apply visibility
    tileset.show = state.visible;

    // Apply opacity
    this.updateTilesetOpacity(tilesetId, tileset, state.opacity);

    console.log(`[TilesManager] Applied state to ${tilesetId}:`, state);
  }

  /**
   * Handle visibility change from AppState
   * @param {string} tilesetId
   * @param {boolean} visible
   */
  handleVisibilityChange(tilesetId, visible) {
    const tileset = this.loadedTilesets.get(tilesetId);
    if (tileset) {
      tileset.show = visible;
      console.log(
        `[TilesManager] ${tilesetId} visibility changed to: ${visible}`
      );
    }
  }

  /**
   * Handle opacity change from AppState
   * @param {string} tilesetId
   * @param {number} opacity
   */
  handleOpacityChange(tilesetId, opacity) {
    const tileset = this.loadedTilesets.get(tilesetId);
    if (tileset) {
      this.updateTilesetOpacity(tilesetId, tileset, opacity);
      console.log(`[TilesManager] ${tilesetId} opacity changed to: ${opacity}`);
    }
  }

  /**
   * Update tileset opacity with proper styling
   * @param {string} tilesetId
   * @param {Cesium.Cesium3DTileset} tileset
   * @param {number} opacity
   */
  updateTilesetOpacity(tilesetId, tileset, opacity) {
    tileset.style = new Cesium.Cesium3DTileStyle({
      color: {
        evaluateColor: function (feature, result) {
          return Cesium.Color.clone(
            Cesium.Color.WHITE.withAlpha(opacity),
            result
          );
        },
      },
    });
  }

  /**
   * Handle tileset removal from AppState
   * @param {string} tilesetId
   */
  handleTilesetRemoval(tilesetId) {
    const tileset = this.loadedTilesets.get(tilesetId);
    if (tileset) {
      // Remove from viewer
      this.viewer.scene.primitives.remove(tileset);

      // Clean up local reference
      this.loadedTilesets.delete(tilesetId);

      console.log(`[TilesManager] Removed tileset: ${tilesetId}`);
    }
  }

  /**
   * Load all configured tilesets
   * @param {string[]} tilesetIds - Array of tileset IDs to load (optional)
   * @returns {Promise<Object>} - Object mapping tileset IDs to loaded tilesets
   */
  async loadAllTilesets(tilesetIds = null) {
    const configs = appState.getAllTilesetConfigs();
    const idsToLoad = tilesetIds || Object.keys(configs);

    console.log(`[TilesManager] Loading tilesets:`, idsToLoad);

    const loadPromises = idsToLoad.map(async (id) => {
      try {
        const tileset = await this.loadTileset(id);
        return { id, tileset, success: true };
      } catch (error) {
        console.error(`[TilesManager] Failed to load ${id}:`, error);
        return { id, error, success: false };
      }
    });

    const results = await Promise.all(loadPromises);

    const loadedTilesets = {};
    const errors = [];

    results.forEach((result) => {
      if (result.success) {
        loadedTilesets[result.id] = result.tileset;
      } else {
        errors.push({ id: result.id, error: result.error });
      }
    });

    if (errors.length > 0) {
      console.warn(`[TilesManager] Some tilesets failed to load:`, errors);
    }

    console.log(
      `[TilesManager] Successfully loaded ${
        Object.keys(loadedTilesets).length
      } tilesets`
    );
    return { loadedTilesets, errors };
  }

  /**
   * Get loaded tileset by ID
   * @param {string} tilesetId
   * @returns {Cesium.Cesium3DTileset|null}
   */
  getTileset(tilesetId) {
    return this.loadedTilesets.get(tilesetId) || null;
  }

  /**
   * Get all loaded tilesets
   * @returns {Map<string, Cesium.Cesium3DTileset>}
   */
  getAllLoadedTilesets() {
    return new Map(this.loadedTilesets);
  }

  /**
   * Check if tileset is loaded
   * @param {string} tilesetId
   * @returns {boolean}
   */
  isTilesetLoaded(tilesetId) {
    return this.loadedTilesets.has(tilesetId);
  }

  /**
   * Remove a specific tileset
   * @param {string} tilesetId
   */
  removeTileset(tilesetId) {
    appState.removeActiveTileset(tilesetId);
    // handleTilesetRemoval will be called automatically via state event
  }

  /**
   * Remove all tilesets
   */
  removeAllTilesets() {
    const loadedIds = Array.from(this.loadedTilesets.keys());
    loadedIds.forEach((id) => this.removeTileset(id));

    console.log("[TilesManager] All tilesets removed");
  }

  /**
   * Destroy the tiles manager and clean up resources
   */
  destroy() {
    console.log("[TilesManager] Destroying tiles manager");

    // Remove all tilesets
    this.removeAllTilesets();

    // Clean up state subscriptions
    this.stateCleanups.forEach((cleanup) => cleanup());
    this.stateCleanups = [];

    // Clear local references
    this.loadedTilesets.clear();
    this.loadingPromises.clear();

    console.log("[TilesManager] Destroyed successfully");
  }
}

/**
 * Factory function for easy instantiation
 * @param {Cesium.Viewer} viewer
 * @returns {TilesManager}
 */
export function createTilesManager(viewer) {
  return new TilesManager(viewer);
}
