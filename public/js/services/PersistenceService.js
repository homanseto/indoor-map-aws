/**
 * Persistence Service
 *
 * Handles saving and restoring application state across browser sessions.
 * Provides automatic persistence with configurable expiration times.
 * Integrates with AppState for seamless state management.
 */

import { appState } from "../shared/AppState.js";

export class PersistenceService {
  constructor() {
    this.storagePrefix = "indoor-map-viewer-";
    this.defaultExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Storage keys
    this.keys = {
      viewMode: this.storagePrefix + "view-mode",
      sidebarState: this.storagePrefix + "sidebar-state",
      buildingContext: this.storagePrefix + "building-context",
      appState: this.storagePrefix + "app-state",
    };

    this.init();
  }

  /**
   * Initialize persistence service
   */
  init() {
    this.setupAutoSave();
    this.loadPersistedState();
    console.log(
      "[PersistenceService] Initialized with auto-save and state restoration"
    );
  }

  /**
   * Setup automatic saving when state changes
   */
  setupAutoSave() {
    // Save view mode changes
    appState.subscribe("viewModeChanged", (data) => {
      this.saveViewMode(data.newMode);
    });

    // Save building context changes
    appState.subscribe("lastActiveVenueChanged", (data) => {
      this.saveBuildingContext(data.newVenueId);
    });

    // Periodic full state backup
    setInterval(() => {
      this.saveFullState();
    }, 30000); // Every 30 seconds

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      this.saveFullState();
    });
  }

  /**
   * Save view mode to localStorage
   */
  saveViewMode(viewMode) {
    try {
      const data = {
        mode: viewMode,
        timestamp: Date.now(),
        expiration: Date.now() + this.defaultExpiration,
      };

      localStorage.setItem(this.keys.viewMode, JSON.stringify(data));
      console.log(`[PersistenceService] View mode saved: ${viewMode}`);
    } catch (error) {
      console.warn("[PersistenceService] Failed to save view mode:", error);
    }
  }

  /**
   * Save building context to localStorage
   */
  saveBuildingContext(venueId) {
    try {
      const data = {
        lastActiveVenueId: venueId,
        timestamp: Date.now(),
        expiration: Date.now() + this.defaultExpiration,
      };

      localStorage.setItem(this.keys.buildingContext, JSON.stringify(data));
      console.log(`[PersistenceService] Building context saved: ${venueId}`);
    } catch (error) {
      console.warn(
        "[PersistenceService] Failed to save building context:",
        error
      );
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  saveSidebarState(isVisible, width) {
    try {
      const data = {
        isVisible: isVisible,
        width: width,
        timestamp: Date.now(),
        expiration: Date.now() + this.defaultExpiration,
      };

      localStorage.setItem(this.keys.sidebarState, JSON.stringify(data));
      console.log(
        `[PersistenceService] Sidebar state saved: visible=${isVisible}, width=${width}`
      );
    } catch (error) {
      console.warn("[PersistenceService] Failed to save sidebar state:", error);
    }
  }

  /**
   * Save full application state
   */
  saveFullState() {
    try {
      const state = {
        viewMode: appState.getViewMode(),
        lastActiveVenueId: appState.getLastActiveVenueId(),
        hiddenVenuePolygons: Array.from(appState.hiddenVenuePolygons || []),
        timestamp: Date.now(),
        expiration: Date.now() + this.defaultExpiration,
      };

      localStorage.setItem(this.keys.appState, JSON.stringify(state));
    } catch (error) {
      console.warn("[PersistenceService] Failed to save full state:", error);
    }
  }

  /**
   * Load and restore persisted state
   */
  loadPersistedState() {
    const viewMode = this.loadViewMode();
    const buildingContext = this.loadBuildingContext();
    const sidebarState = this.loadSidebarState();

    // Apply loaded state
    if (viewMode) {
      appState.setViewMode(viewMode);
      console.log(`[PersistenceService] Restored view mode: ${viewMode}`);
    }

    if (buildingContext && buildingContext.lastActiveVenueId) {
      // Note: Building objects can't be persisted, only the venue ID
      // The actual building will need to be loaded by the application
      appState.setLastActiveVenueId(buildingContext.lastActiveVenueId);
      console.log(
        `[PersistenceService] Restored building context: ${buildingContext.lastActiveVenueId}`
      );
    }

    return {
      viewMode,
      buildingContext,
      sidebarState,
    };
  }

  /**
   * Load view mode from localStorage
   */
  loadViewMode() {
    try {
      const stored = localStorage.getItem(this.keys.viewMode);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Check expiration
      if (Date.now() > data.expiration) {
        localStorage.removeItem(this.keys.viewMode);
        return null;
      }

      return data.mode;
    } catch (error) {
      console.warn("[PersistenceService] Failed to load view mode:", error);
      localStorage.removeItem(this.keys.viewMode);
      return null;
    }
  }

  /**
   * Load building context from localStorage
   */
  loadBuildingContext() {
    try {
      const stored = localStorage.getItem(this.keys.buildingContext);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Check expiration
      if (Date.now() > data.expiration) {
        localStorage.removeItem(this.keys.buildingContext);
        return null;
      }

      return {
        lastActiveVenueId: data.lastActiveVenueId,
      };
    } catch (error) {
      console.warn(
        "[PersistenceService] Failed to load building context:",
        error
      );
      localStorage.removeItem(this.keys.buildingContext);
      return null;
    }
  }

  /**
   * Load sidebar state from localStorage
   */
  loadSidebarState() {
    try {
      const stored = localStorage.getItem(this.keys.sidebarState);
      if (!stored) return null;

      const data = JSON.parse(stored);

      // Check expiration
      if (Date.now() > data.expiration) {
        localStorage.removeItem(this.keys.sidebarState);
        return null;
      }

      return {
        isVisible: data.isVisible,
        width: data.width,
      };
    } catch (error) {
      console.warn("[PersistenceService] Failed to load sidebar state:", error);
      localStorage.removeItem(this.keys.sidebarState);
      return null;
    }
  }

  /**
   * Clear all persisted data
   */
  clearAllData() {
    Object.values(this.keys).forEach((key) => {
      localStorage.removeItem(key);
    });
    console.log("[PersistenceService] All persisted data cleared");
  }

  /**
   * Clear expired data
   */
  clearExpiredData() {
    const now = Date.now();
    let clearedCount = 0;

    Object.values(this.keys).forEach((key) => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expiration && now > data.expiration) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      } catch (error) {
        // Invalid data, remove it
        localStorage.removeItem(key);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`[PersistenceService] Cleared ${clearedCount} expired items`);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo() {
    const info = {
      keys: this.keys,
      usage: {},
      totalSize: 0,
    };

    Object.entries(this.keys).forEach(([name, key]) => {
      const item = localStorage.getItem(key);
      const size = item ? item.length : 0;
      info.usage[name] = {
        exists: !!item,
        size: size,
        sizeKB: Math.round((size / 1024) * 100) / 100,
      };
      info.totalSize += size;
    });

    info.totalSizeKB = Math.round((info.totalSize / 1024) * 100) / 100;

    return info;
  }

  /**
   * Create a method for manual backup/restore
   */
  exportState() {
    const state = {};

    Object.entries(this.keys).forEach(([name, key]) => {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          state[name] = JSON.parse(item);
        } catch (error) {
          state[name] = item; // Store as string if JSON parsing fails
        }
      }
    });

    return state;
  }

  /**
   * Import state from backup
   */
  importState(state) {
    Object.entries(state).forEach(([name, data]) => {
      if (this.keys[name]) {
        try {
          const jsonData =
            typeof data === "string" ? data : JSON.stringify(data);
          localStorage.setItem(this.keys[name], jsonData);
        } catch (error) {
          console.warn(`[PersistenceService] Failed to import ${name}:`, error);
        }
      }
    });

    console.log("[PersistenceService] State imported successfully");
    this.loadPersistedState();
  }
}

// Create singleton instance
export const persistenceService = new PersistenceService();

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.persistenceService = persistenceService;
}
