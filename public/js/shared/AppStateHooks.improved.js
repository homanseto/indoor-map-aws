/**
 * IMPROVED Application State Hooks and Utilities
 *
 * Enhanced version with intelligent event mapping and performance optimization.
 * Only subscribes to events that can actually affect the selected state slice.
 *
 * @version 2.0.0
 */

import { appState } from "./AppState.js";

/**
 * Event-to-StateMethod mapping for intelligent subscription
 */
const EVENT_STATE_MAP = {
  // Building-related events
  buildingAdded: [
    "getAllActiveBuildings",
    "getActiveBuilding",
    "isBuildingActive",
  ],
  buildingRemoved: [
    "getAllActiveBuildings",
    "getActiveBuilding",
    "isBuildingActive",
  ],

  // Network-related events
  networkAdded: ["getAllActiveNetworks", "getActiveNetwork"],
  networkRemoved: ["getAllActiveNetworks", "getActiveNetwork"],

  // Venue/context events
  lastActiveVenueChanged: ["getLastActiveVenueId"],
  venueDataChanged: ["getVenueGeoJson", "findVenueById"],

  // UI state events
  viewModeChanged: ["getViewMode", "isIn2DMode"],
  processingClickChanged: ["isClickProcessing"],
  kickModeChanged: ["getKickMode"],
  networkVisibilityChanged: ["getNetworkVisible"],
  selectedLevelChanged: ["getSelectedLevel"],

  // Label state events
  unitLabelStateChanged: ["getUnitLabelState"],

  // Viewer events
  viewerChanged: ["getViewer"],
  sidebarChanged: ["getMapSidebar"],

  // Batch operations
  allActiveCleared: [
    "getAllActiveBuildings",
    "getAllActiveNetworks",
    "getLastActiveVenueId",
  ],
};

/**
 * Enhanced State Hook System with intelligent event subscription
 */
export class StateHooks {
  /**
   * Create a reactive hook with intelligent event detection
   * @param {function} selector - Function to select state slice
   * @param {function} callback - Callback when state changes
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useStateSlice(selector, callback, options = {}) {
    const { debugMode = false, customEvents = [] } = options;

    let currentValue = selector(appState);
    const unsubscribeCallbacks = [];

    // Analyze selector to determine required events
    const requiredEvents = StateHooks._analyzeSelector(
      selector,
      customEvents,
      debugMode
    );

    if (debugMode) {
      console.log(`[StateHooks] Hook created with events:`, requiredEvents);
    }

    // Subscribe only to relevant events
    requiredEvents.forEach((event) => {
      const unsubscribe = appState.subscribe(event, (eventData) => {
        const newValue = selector(appState);
        if (StateHooks._hasChanged(currentValue, newValue)) {
          const previousValue = currentValue;
          currentValue = newValue;

          if (debugMode) {
            console.log(`[StateHooks] ${event} triggered change:`, {
              event,
              eventData,
              previous: previousValue,
              current: newValue,
            });
          }

          callback(newValue, previousValue, event);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    // Return cleanup function with debug info
    const cleanup = () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
      if (debugMode) {
        console.log(
          `[StateHooks] Hook cleaned up, unsubscribed from:`,
          requiredEvents
        );
      }
    };

    // Add debug property to cleanup function
    cleanup.events = requiredEvents;
    cleanup.selector = selector.toString();

    return cleanup;
  }

  /**
   * Analyze selector function to determine required events
   * @private
   */
  static _analyzeSelector(selector, customEvents, debugMode) {
    const selectorString = selector.toString();
    const requiredEvents = new Set(customEvents);

    // Check each event's associated methods
    Object.entries(EVENT_STATE_MAP).forEach(([event, methods]) => {
      const isRequired = methods.some(
        (method) =>
          selectorString.includes(method) ||
          selectorString.includes(method.replace("get", "").toLowerCase())
      );

      if (isRequired) {
        requiredEvents.add(event);
      }
    });

    // If no specific events found, fall back to essential events
    if (requiredEvents.size === 0) {
      if (debugMode) {
        console.warn(
          "[StateHooks] No specific events detected, using fallback events"
        );
      }
      return ["lastActiveVenueChanged", "viewModeChanged", "allActiveCleared"];
    }

    return Array.from(requiredEvents);
  }

  /**
   * Deep comparison for state changes
   * @private
   */
  static _hasChanged(oldValue, newValue) {
    if (oldValue === newValue) return false;

    // Handle primitive types
    if (typeof oldValue !== "object" || typeof newValue !== "object") {
      return oldValue !== newValue;
    }

    // Handle null values
    if (oldValue === null || newValue === null) {
      return oldValue !== newValue;
    }

    // For objects, do shallow comparison
    try {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    } catch (error) {
      // Fallback for non-serializable objects
      return true;
    }
  }

  /**
   * Hook for building state changes - optimized
   * @param {function} callback - Callback with building data
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useBuildingState(callback, options = {}) {
    return this.useStateSlice(
      (state) => ({
        activeBuildings: state.getAllActiveBuildings(),
        lastActiveVenueId: state.getLastActiveVenueId(),
        count: state.getAllActiveBuildings().size,
      }),
      callback,
      {
        ...options,
        customEvents: [
          "buildingAdded",
          "buildingRemoved",
          "lastActiveVenueChanged",
          "allActiveCleared",
        ],
      }
    );
  }

  /**
   * Hook for UI state changes - optimized
   * @param {function} callback - Callback with UI data
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useUIState(callback, options = {}) {
    return this.useStateSlice(
      (state) => ({
        viewMode: state.getViewMode(),
        isProcessing: state.isClickProcessing(),
        lastActiveVenue: state.getLastActiveVenueId(),
        kickMode: state.getKickMode(),
        networkVisible: state.getNetworkVisible(),
        selectedLevel: state.getSelectedLevel(),
      }),
      callback,
      {
        ...options,
        customEvents: [
          "viewModeChanged",
          "processingClickChanged",
          "lastActiveVenueChanged",
          "kickModeChanged",
          "networkVisibilityChanged",
          "selectedLevelChanged",
        ],
      }
    );
  }

  /**
   * Hook for viewer state - optimized
   * @param {function} callback - Callback with viewer data
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useViewerState(callback, options = {}) {
    return this.useStateSlice(
      (state) => ({
        viewer: state.getViewer(),
        sidebar: state.getMapSidebar(),
        hasViewer: !!state.getViewer(),
      }),
      callback,
      {
        ...options,
        customEvents: ["viewerChanged", "sidebarChanged"],
      }
    );
  }

  /**
   * Hook for unit label state - optimized
   * @param {function} callback - Callback with label data
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useUnitLabelState(callback, options = {}) {
    return this.useStateSlice((state) => state.getUnitLabelState(), callback, {
      ...options,
      customEvents: ["unitLabelStateChanged"],
    });
  }

  /**
   * Hook for network state - optimized
   * @param {function} callback - Callback with network data
   * @param {Object} options - Configuration options
   * @returns {function} Cleanup function
   */
  static useNetworkState(callback, options = {}) {
    return this.useStateSlice(
      (state) => ({
        activeNetworks: state.getAllActiveNetworks(),
        networkVisible: state.getNetworkVisible(),
        lastActiveVenue: state.getLastActiveVenueId(),
      }),
      callback,
      {
        ...options,
        customEvents: [
          "networkAdded",
          "networkRemoved",
          "networkVisibilityChanged",
          "lastActiveVenueChanged",
          "allActiveCleared",
        ],
      }
    );
  }

  /**
   * Custom hook builder for specific state slices
   * @param {string} hookName - Name for debugging
   * @param {function} selector - State selector function
   * @param {Array} events - Specific events to listen to
   * @returns {function} Hook function
   */
  static createCustomHook(hookName, selector, events = []) {
    return (callback, options = {}) => {
      return this.useStateSlice(
        selector,
        (newValue, previousValue, triggerEvent) => {
          console.log(`[${hookName}] State changed via ${triggerEvent}`);
          callback(newValue, previousValue, triggerEvent);
        },
        {
          ...options,
          customEvents: events,
          debugMode: true,
        }
      );
    };
  }
}

/**
 * Enhanced State Actions with event tracking
 */
export class StateActions {
  /**
   * Initialize application with viewer
   * @param {Cesium.Viewer} viewer
   */
  static initializeApp(viewer) {
    console.log(
      "[StateActions] Initializing app - will trigger 'viewerChanged'"
    );
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
    console.log(
      `[StateActions] Loading building - will trigger multiple events`
    );

    // Switch from previous building if needed
    const lastActive = appState.getLastActiveVenueId();
    if (lastActive && lastActive !== venueId) {
      StateActions.deactivateBuilding(lastActive);
    }

    // Set new building as active (triggers 'buildingAdded')
    appState.setActiveBuilding(venueId, building);
    if (network) {
      // Triggers 'networkAdded'
      appState.setActiveNetwork(venueId, network);
    }
    // Triggers 'lastActiveVenueChanged'
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
    console.log(`[StateActions] Deactivating building ${venueId}`);

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
   * Switch between 2D and 3D modes
   * @param {'2D'|'3D'} mode
   */
  static switchViewMode(mode) {
    const currentMode = appState.getViewMode();
    if (currentMode === mode) return;

    console.log(
      `[StateActions] Switching view mode - will trigger 'viewModeChanged'`
    );
    appState.setViewMode(mode); // Triggers 'viewModeChanged'

    console.log(
      `[StateActions] View mode switched from ${currentMode} to ${mode}`
    );
  }

  // ... other methods remain the same
}

/**
 * Hook Development and Debugging Tools
 */
export class HookDev {
  /**
   * Monitor all active hooks and their events
   */
  static monitorHooks() {
    const activeHooks = new Map();
    let hookCounter = 0;

    // Override useStateSlice to track hooks
    const originalUseStateSlice = StateHooks.useStateSlice;
    StateHooks.useStateSlice = function (selector, callback, options = {}) {
      const hookId = `hook-${++hookCounter}`;
      const cleanup = originalUseStateSlice.call(this, selector, callback, {
        ...options,
        debugMode: true,
      });

      activeHooks.set(hookId, {
        events: cleanup.events,
        selector: cleanup.selector,
        created: new Date().toISOString(),
      });

      const originalCleanup = cleanup;
      return function () {
        activeHooks.delete(hookId);
        console.log(`[HookDev] Hook ${hookId} cleaned up`);
        return originalCleanup();
      };
    };

    // Log current hooks
    const logHooks = () => {
      console.group("[HookDev] Active Hooks Summary");
      console.table(Object.fromEntries(activeHooks));
      console.groupEnd();
    };

    // Return monitoring interface
    return {
      logHooks,
      getActiveHooks: () => activeHooks,
      getHookCount: () => activeHooks.size,
      stopMonitoring: () => {
        StateHooks.useStateSlice = originalUseStateSlice;
        console.log("[HookDev] Hook monitoring stopped");
      },
    };
  }

  /**
   * Analyze event subscription efficiency
   */
  static analyzeEventEfficiency() {
    const eventCounts = {};

    // Simulate different hook types
    const testHooks = [
      {
        name: "Building Hook",
        selector: (state) => ({ buildings: state.getAllActiveBuildings() }),
        expectedEvents: [
          "buildingAdded",
          "buildingRemoved",
          "allActiveCleared",
        ],
      },
      {
        name: "UI Hook",
        selector: (state) => ({
          mode: state.getViewMode(),
          kick: state.getKickMode(),
        }),
        expectedEvents: ["viewModeChanged", "kickModeChanged"],
      },
      {
        name: "Network Hook",
        selector: (state) => ({ visible: state.getNetworkVisible() }),
        expectedEvents: ["networkVisibilityChanged"],
      },
    ];

    testHooks.forEach(({ name, selector, expectedEvents }) => {
      const actualEvents = StateHooks._analyzeSelector(selector, [], true);

      console.log(`\n[HookDev] ${name}:`);
      console.log(`  Expected: ${expectedEvents.join(", ")}`);
      console.log(`  Detected: ${actualEvents.join(", ")}`);
      console.log(
        `  Efficiency: ${
          expectedEvents.every((e) => actualEvents.includes(e))
            ? "✅ Good"
            : "⚠️ Check"
        }`
      );

      actualEvents.forEach((event) => {
        eventCounts[event] = (eventCounts[event] || 0) + 1;
      });
    });

    console.log("\n[HookDev] Event subscription frequency:");
    console.table(eventCounts);
  }
}

// Make available globally for development
if (typeof window !== "undefined") {
  window.StateHooksV2 = StateHooks;
  window.StateActionsV2 = StateActions;
  window.HookDev = HookDev;
}

export { StateActions, StateValidators, StateDev } from "./AppStateHooks.js";
