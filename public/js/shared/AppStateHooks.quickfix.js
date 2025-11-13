/**
 * QUICK FIX: Event-Specific Hook Variants
 *
 * Add these methods to your existing AppStateHooks.js to get specific event subscriptions
 * without changing the core useStateSlice function.
 */

export class StateHooksQuickFix {
  /**
   * Building-specific hook - only building events
   */
  static useBuildingStateOptimized(callback) {
    const buildingEvents = [
      "buildingAdded",
      "buildingRemoved",
      "lastActiveVenueChanged",
      "allActiveCleared",
    ];

    let currentValue = (state) =>
      ({
        activeBuildings: state.getAllActiveBuildings(),
        lastActiveVenueId: state.getLastActiveVenueId(),
        count: state.getAllActiveBuildings().size,
      }(appState));

    const unsubscribeCallbacks = [];

    buildingEvents.forEach((event) => {
      const unsubscribe = appState.subscribe(event, () => {
        const newValue = ((state) => ({
          activeBuildings: state.getAllActiveBuildings(),
          lastActiveVenueId: state.getLastActiveVenueId(),
          count: state.getAllActiveBuildings().size,
        }))(appState);

        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          currentValue = newValue;
          callback(newValue);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    console.log(
      `[StateHooks] Building hook created with events: ${buildingEvents.join(
        ", "
      )}`
    );

    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
      console.log(`[StateHooks] Building hook cleaned up`);
    };
  }

  /**
   * UI-specific hook - only UI events
   */
  static useUIStateOptimized(callback) {
    const uiEvents = [
      "viewModeChanged",
      "processingClickChanged",
      "lastActiveVenueChanged",
      "kickModeChanged",
      "networkVisibilityChanged",
      "selectedLevelChanged", // Add this if it exists in AppState
    ];

    let currentValue = (state) =>
      ({
        viewMode: state.getViewMode(),
        isProcessing: state.isClickProcessing(),
        lastActiveVenue: state.getLastActiveVenueId(),
        kickMode: state.getKickMode(),
        networkVisible: state.getNetworkVisible(),
      }(appState));

    const unsubscribeCallbacks = [];

    uiEvents.forEach((event) => {
      const unsubscribe = appState.subscribe(event, () => {
        const newValue = ((state) => ({
          viewMode: state.getViewMode(),
          isProcessing: state.isClickProcessing(),
          lastActiveVenue: state.getLastActiveVenueId(),
          kickMode: state.getKickMode(),
          networkVisible: state.getNetworkVisible(),
        }))(appState);

        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          currentValue = newValue;
          callback(newValue);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    console.log(
      `[StateHooks] UI hook created with events: ${uiEvents.join(", ")}`
    );

    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
      console.log(`[StateHooks] UI hook cleaned up`);
    };
  }

  /**
   * Network-specific hook - only network events
   */
  static useNetworkStateOptimized(callback) {
    const networkEvents = [
      "networkAdded",
      "networkRemoved",
      "networkVisibilityChanged",
      "lastActiveVenueChanged",
      "allActiveCleared",
    ];

    let currentValue = (state) =>
      ({
        activeNetworks: state.getAllActiveNetworks(),
        networkVisible: state.getNetworkVisible(),
        lastActiveVenue: state.getLastActiveVenueId(),
      }(appState));

    const unsubscribeCallbacks = [];

    networkEvents.forEach((event) => {
      const unsubscribe = appState.subscribe(event, () => {
        const newValue = ((state) => ({
          activeNetworks: state.getAllActiveNetworks(),
          networkVisible: state.getNetworkVisible(),
          lastActiveVenue: state.getLastActiveVenueId(),
        }))(appState);

        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          currentValue = newValue;
          callback(newValue);
        }
      });
      unsubscribeCallbacks.push(unsubscribe);
    });

    console.log(
      `[StateHooks] Network hook created with events: ${networkEvents.join(
        ", "
      )}`
    );

    return () => {
      unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
      console.log(`[StateHooks] Network hook cleaned up`);
    };
  }
}

// Usage in your components:
/*
// ✅ OPTIMIZED: Only subscribes to building events
const cleanup = StateHooksQuickFix.useBuildingStateOptimized((buildingState) => {
  this.updateBuildingUI(buildingState);
});

// ✅ OPTIMIZED: Only subscribes to UI events  
const cleanup2 = StateHooksQuickFix.useUIStateOptimized((uiState) => {
  this.updateModeButton(uiState.viewMode);
});
*/
