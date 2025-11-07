/**
 * Debug View Switching Tool
 *
 * A comprehensive debugging tool to diagnose 2D/3D view switching issues.
 * Use in browser console to trace the exact problem.
 */

class ViewSwitchingDebugger {
  constructor() {
    this.logs = [];
    this.init();
  }

  init() {
    console.log("🔧 View Switching Debugger loaded");
    console.log("Available methods:");
    console.log("  - debugger.diagnose() - Full system diagnosis");
    console.log(
      "  - debugger.testSwitch() - Test view switching with detailed logging"
    );
    console.log("  - debugger.forceSync() - Force synchronization");
    console.log("  - debugger.showState() - Show current state");
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, level };
    this.logs.push(logEntry);

    const emoji =
      level === "error"
        ? "❌"
        : level === "warn"
        ? "⚠️"
        : level === "success"
        ? "✅"
        : "ℹ️";
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  diagnose() {
    this.log("🔍 Starting comprehensive diagnosis...", "info");

    // Check 1: Basic component availability
    this.log("=== COMPONENT AVAILABILITY CHECK ===", "info");
    this.checkComponent("window.viewer", "Cesium Viewer");
    this.checkComponent("window.appState", "AppState");
    this.checkComponent(
      "window.viewControllerManager",
      "ViewControllerManager"
    );
    this.checkComponent("window.viewManager2D", "ViewManager2D");
    this.checkComponent("window.mapSidebar", "Sidebar");
    this.checkComponent("window.persistenceService", "PersistenceService");
    this.checkComponent("window.notificationSystem", "NotificationSystem");

    // Check 2: State consistency
    this.log("=== STATE CONSISTENCY CHECK ===", "info");
    this.checkStateConsistency();

    // Check 3: Building context
    this.log("=== BUILDING CONTEXT CHECK ===", "info");
    this.checkBuildingContext();

    // Check 4: Event system
    this.log("=== EVENT SYSTEM CHECK ===", "info");
    this.checkEventSystem();

    // Check 5: UI sync
    this.log("=== UI SYNCHRONIZATION CHECK ===", "info");
    this.checkUISync();

    this.log("🏁 Diagnosis complete! Check logs above for issues.", "success");
  }

  checkComponent(path, name) {
    try {
      const component = eval(path);
      if (component) {
        this.log(`✅ ${name} is available`, "success");
        return true;
      } else {
        this.log(`❌ ${name} is not available (${path})`, "error");
        return false;
      }
    } catch (error) {
      this.log(`❌ ${name} check failed: ${error.message}`, "error");
      return false;
    }
  }

  checkStateConsistency() {
    try {
      const appStateMode = window.appState.getViewMode();
      const viewManager2DMode = window.viewManager2D
        ? window.viewManager2D.isIn2DMode()
        : null;

      this.log(`AppState view mode: ${appStateMode}`, "info");
      this.log(`ViewManager2D mode: ${viewManager2DMode}`, "info");

      if (appStateMode === "2D" && viewManager2DMode === true) {
        this.log(
          "✅ State consistency: Both systems report 2D mode",
          "success"
        );
      } else if (appStateMode === "3D" && viewManager2DMode === false) {
        this.log(
          "✅ State consistency: Both systems report 3D mode",
          "success"
        );
      } else {
        this.log(
          `❌ State inconsistency detected! AppState: ${appStateMode}, ViewManager2D: ${viewManager2DMode}`,
          "error"
        );
      }
    } catch (error) {
      this.log(`❌ State consistency check failed: ${error.message}`, "error");
    }
  }

  checkBuildingContext() {
    try {
      const lastActiveVenue = window.appState.getLastActiveVenueId();
      const activeBuildings = window.appState.getAllActiveBuildings();
      const controllerContext = window.viewControllerManager
        ? window.viewControllerManager.getCurrentBuildingContext()
        : null;

      this.log(`Last active venue: ${lastActiveVenue}`, "info");
      this.log(`Active buildings count: ${activeBuildings.size}`, "info");
      this.log(
        `Controller has context: ${
          controllerContext ? controllerContext.hasContext : "N/A"
        }`,
        "info"
      );

      if (lastActiveVenue && activeBuildings.size > 0) {
        this.log("✅ Building context available", "success");
      } else {
        this.log("⚠️ No building context - 2D mode will not work", "warn");
      }
    } catch (error) {
      this.log(`❌ Building context check failed: ${error.message}`, "error");
    }
  }

  checkEventSystem() {
    try {
      // Test if state change events work
      let eventReceived = false;
      const cleanup = window.appState.subscribe("viewModeChanged", () => {
        eventReceived = true;
      });

      const originalMode = window.appState.getViewMode();
      const testMode = originalMode === "2D" ? "3D" : "2D";

      window.appState.setViewMode(testMode);

      if (eventReceived) {
        this.log(
          "✅ Event system working - state change events fired",
          "success"
        );
      } else {
        this.log("❌ Event system broken - no events received", "error");
      }

      // Restore original mode
      window.appState.setViewMode(originalMode);
      cleanup();
    } catch (error) {
      this.log(`❌ Event system check failed: ${error.message}`, "error");
    }
  }

  checkUISync() {
    try {
      const button = document.querySelector(".view-2d-button");
      if (!button) {
        this.log("❌ 2D/3D toggle button not found", "error");
        return;
      }

      const currentMode = window.appState.getViewMode();
      const isActive = button.classList.contains("active");
      const expectedActive = currentMode === "2D";

      this.log(`Current mode: ${currentMode}`, "info");
      this.log(`Button active: ${isActive}`, "info");
      this.log(`Expected active: ${expectedActive}`, "info");

      if (isActive === expectedActive) {
        this.log("✅ UI is synchronized with state", "success");
      } else {
        this.log("❌ UI out of sync with state", "error");
      }
    } catch (error) {
      this.log(`❌ UI sync check failed: ${error.message}`, "error");
    }
  }

  async testSwitch() {
    this.log("🧪 Starting view switching test...", "info");

    try {
      const originalMode = window.appState.getViewMode();
      const targetMode = originalMode === "2D" ? "3D" : "2D";

      this.log(`Original mode: ${originalMode}`, "info");
      this.log(`Target mode: ${targetMode}`, "info");

      // Check prerequisites for 2D mode
      if (targetMode === "2D") {
        const hasBuilding = window.appState.getLastActiveVenueId() !== null;
        if (!hasBuilding) {
          this.log("❌ Cannot test 2D mode: No building selected", "error");
          return;
        }
      }

      // Perform the switch
      this.log(`🔄 Switching to ${targetMode} mode...`, "info");
      window.appState.setViewMode(targetMode);

      // Wait a bit for processing
      await this.wait(500);

      // Check results
      const newAppStateMode = window.appState.getViewMode();
      const newViewManager2DMode = window.viewManager2D.isIn2DMode();

      this.log(`Post-switch AppState mode: ${newAppStateMode}`, "info");
      this.log(
        `Post-switch ViewManager2D mode: ${newViewManager2DMode}`,
        "info"
      );

      // Verify success
      if (newAppStateMode === targetMode) {
        this.log("✅ AppState updated correctly", "success");
      } else {
        this.log(
          `❌ AppState not updated: expected ${targetMode}, got ${newAppStateMode}`,
          "error"
        );
      }

      const expectedViewManager2DMode = targetMode === "2D";
      if (newViewManager2DMode === expectedViewManager2DMode) {
        this.log("✅ ViewManager2D updated correctly", "success");
      } else {
        this.log(
          `❌ ViewManager2D not updated: expected ${expectedViewManager2DMode}, got ${newViewManager2DMode}`,
          "error"
        );
      }

      // Restore original mode
      window.appState.setViewMode(originalMode);

      this.log("🏁 View switching test complete", "success");
    } catch (error) {
      this.log(`❌ View switching test failed: ${error.message}`, "error");
    }
  }

  forceSync() {
    this.log("🔄 Forcing synchronization...", "info");

    try {
      if (
        window.viewControllerManager &&
        typeof window.viewControllerManager.forceSyncWithState === "function"
      ) {
        window.viewControllerManager.forceSyncWithState();
        this.log("✅ Force sync completed", "success");
      } else {
        this.log(
          "❌ ViewControllerManager not available or missing forceSyncWithState method",
          "error"
        );
      }
    } catch (error) {
      this.log(`❌ Force sync failed: ${error.message}`, "error");
    }
  }

  showState() {
    this.log("📊 Current system state:", "info");

    try {
      const state = {
        appState: {
          viewMode: window.appState.getViewMode(),
          lastActiveVenue: window.appState.getLastActiveVenueId(),
          activeBuildingsCount: window.appState.getAllActiveBuildings().size,
        },
        viewManager2D: {
          isIn2DMode: window.viewManager2D
            ? window.viewManager2D.isIn2DMode()
            : null,
          hasActiveBounds: window.viewManager2D
            ? !!window.viewManager2D.activeBuildingBounds
            : null,
        },
        controller: {
          hasContext: window.viewControllerManager
            ? window.viewControllerManager.getCurrentBuildingContext()
                .hasContext
            : null,
        },
        ui: {
          buttonExists: !!document.querySelector(".view-2d-button"),
          buttonActive:
            document
              .querySelector(".view-2d-button")
              ?.classList.contains("active") || false,
        },
      };

      console.table(state);
    } catch (error) {
      this.log(`❌ Show state failed: ${error.message}`, "error");
    }
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Quick fix methods
  fixUISync() {
    this.log("🔧 Attempting to fix UI synchronization...", "info");

    try {
      const currentMode = window.appState.getViewMode();
      const event = new CustomEvent("viewModeChanged", {
        detail: { is2DMode: currentMode === "2D" },
      });
      document.dispatchEvent(event);

      this.log("✅ UI sync event dispatched", "success");
    } catch (error) {
      this.log(`❌ UI sync fix failed: ${error.message}`, "error");
    }
  }

  // Export logs for analysis
  exportLogs() {
    const logsText = this.logs
      .map(
        (log) => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
      )
      .join("\n");

    console.log("📝 Exported logs:\n", logsText);
    return logsText;
  }
}

// Create global debugger instance
window.debugger = new ViewSwitchingDebugger();

console.log("🔧 View Switching Debugger ready!");
console.log("Usage: debugger.diagnose() or debugger.testSwitch()");
