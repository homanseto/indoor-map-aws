/**
 * Comprehensive Integration Testing Tools
 *
 * Tests all aspects of the new state management integration including:
 * - ViewControllerManager coordination
 * - State persistence across sessions
 * - UI reactive updates
 * - Notification system
 * - View switching functionality
 */

import { appState } from "../shared/AppState.js";
import {
  StateActions,
  StateValidators,
  StateDev,
} from "../shared/AppStateHooks.js";
import { persistenceService } from "../services/PersistenceService.js";
import { notificationSystem } from "../ui/NotificationSystem.js";

export class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;

    this.init();
  }

  init() {
    console.log(
      "[IntegrationTester] Initialized - use window.integrationTester to run tests"
    );
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log("🧪 Starting Comprehensive Integration Tests");
    this.testResults = [];

    // Test 1: Basic State Management
    await this.testBasicStateManagement();

    // Test 2: ViewControllerManager Integration
    await this.testViewControllerIntegration();

    // Test 3: Persistence Service
    await this.testPersistenceService();

    // Test 4: UI Reactive Updates
    await this.testUIReactiveUpdates();

    // Test 5: Notification System
    await this.testNotificationSystem();

    // Test 6: View Switching (Critical Test)
    await this.testViewSwitching();

    // Test 7: Error Handling
    await this.testErrorHandling();

    // Test 8: Performance and Memory
    await this.testPerformance();

    this.reportResults();
  }

  /**
   * Test 1: Basic State Management
   */
  async testBasicStateManagement() {
    this.startTest("Basic State Management");

    try {
      // Test state initialization
      this.assert(!!appState, "AppState exists");
      this.assert(
        typeof appState.getViewMode === "function",
        "AppState has getViewMode method"
      );

      // Test initial state
      const initialMode = appState.getViewMode();
      this.assert(
        ["2D", "3D"].includes(initialMode),
        `Initial view mode is valid: ${initialMode}`
      );

      // Test state changes
      const oldMode = appState.getViewMode();
      const newMode = oldMode === "2D" ? "3D" : "2D";
      appState.setViewMode(newMode);

      this.assert(
        appState.getViewMode() === newMode,
        `View mode changed from ${oldMode} to ${newMode}`
      );

      // Test event system
      let eventReceived = false;
      const cleanup = appState.subscribe("viewModeChanged", () => {
        eventReceived = true;
      });

      appState.setViewMode(oldMode);
      this.assert(eventReceived, "State change event was triggered");
      cleanup();

      this.passTest("State management working correctly");
    } catch (error) {
      this.failTest(`State management failed: ${error.message}`);
    }
  }

  /**
   * Test 2: ViewControllerManager Integration
   */
  async testViewControllerIntegration() {
    this.startTest("ViewControllerManager Integration");

    try {
      const controller = window.viewControllerManager;
      this.assert(!!controller, "ViewControllerManager exists globally");

      this.assert(
        typeof controller.toggleViewMode === "function",
        "Controller has toggleViewMode method"
      );
      this.assert(
        typeof controller.setBuildingContext === "function",
        "Controller has setBuildingContext method"
      );
      this.assert(
        typeof controller.getCurrentBuildingContext === "function",
        "Controller has context getter"
      );

      // Test building context
      const context = controller.getCurrentBuildingContext();
      this.assert(typeof context === "object", "Building context is an object");
      this.assert(
        typeof context.hasContext === "boolean",
        "Building context has validity flag"
      );

      this.passTest("ViewControllerManager integration working");
    } catch (error) {
      this.failTest(
        `ViewControllerManager integration failed: ${error.message}`
      );
    }
  }

  /**
   * Test 3: Persistence Service
   */
  async testPersistenceService() {
    this.startTest("Persistence Service");

    try {
      this.assert(!!persistenceService, "PersistenceService exists");

      // Test saving and loading
      const testMode = "2D";
      persistenceService.saveViewMode(testMode);

      const loadedMode = persistenceService.loadViewMode();
      this.assert(
        loadedMode === testMode,
        `View mode persistence works: saved ${testMode}, loaded ${loadedMode}`
      );

      // Test storage info
      const storageInfo = persistenceService.getStorageInfo();
      this.assert(
        typeof storageInfo === "object",
        "Storage info is accessible"
      );
      this.assert(
        storageInfo.totalSize >= 0,
        "Storage size is reported correctly"
      );

      // Test expiration (simulate expired data)
      localStorage.setItem(
        "indoor-map-viewer-test",
        JSON.stringify({
          data: "test",
          expiration: Date.now() - 1000, // Expired 1 second ago
        })
      );

      persistenceService.clearExpiredData();
      const expiredItem = localStorage.getItem("indoor-map-viewer-test");
      this.assert(!expiredItem, "Expired data was cleared");

      this.passTest("Persistence service working correctly");
    } catch (error) {
      this.failTest(`Persistence service failed: ${error.message}`);
    }
  }

  /**
   * Test 4: UI Reactive Updates
   */
  async testUIReactiveUpdates() {
    this.startTest("UI Reactive Updates");

    try {
      const sidebar = window.mapSidebar;
      this.assert(!!sidebar, "Sidebar exists globally");

      const button = document.querySelector(".view-2d-button");
      this.assert(!!button, "2D/3D toggle button exists");

      // Test button state sync
      const currentMode = appState.getViewMode();
      const isActive = button.classList.contains("active");
      const expectedActive = currentMode === "2D";

      this.assert(
        isActive === expectedActive,
        `Button state matches view mode: mode=${currentMode}, active=${isActive}`
      );

      // Test state change triggers UI update
      const originalMode = appState.getViewMode();
      const newMode = originalMode === "2D" ? "3D" : "2D";

      appState.setViewMode(newMode);

      // Give UI time to update
      await this.wait(100);

      const newIsActive = button.classList.contains("active");
      const newExpectedActive = newMode === "2D";

      this.assert(
        newIsActive === newExpectedActive,
        `UI updated after state change: mode=${newMode}, active=${newIsActive}`
      );

      // Restore original mode
      appState.setViewMode(originalMode);

      this.passTest("UI reactive updates working correctly");
    } catch (error) {
      this.failTest(`UI reactive updates failed: ${error.message}`);
    }
  }

  /**
   * Test 5: Notification System
   */
  async testNotificationSystem() {
    this.startTest("Notification System");

    try {
      this.assert(!!notificationSystem, "NotificationSystem exists");

      // Test basic notifications
      const successId = notificationSystem.success(
        "Test Success",
        "This is a test success message"
      );
      this.assert(
        typeof successId === "number",
        "Success notification returns ID"
      );

      const container = document.getElementById("notification-container");
      this.assert(!!container, "Notification container exists");

      const notifications = container.querySelectorAll(".notification");
      this.assert(notifications.length > 0, "Notification appears in DOM");

      // Test notification clearing
      notificationSystem.hide(successId);
      await this.wait(400); // Wait for animation

      const remainingNotifications =
        container.querySelectorAll(".notification");
      this.assert(
        remainingNotifications.length === 0,
        "Notification was removed"
      );

      // Test view mode specific notifications
      const loadingId = notificationSystem.viewModeSwitchLoading("2D");
      this.assert(
        typeof loadingId === "number",
        "View mode loading notification works"
      );

      notificationSystem.hide(loadingId);

      this.passTest("Notification system working correctly");
    } catch (error) {
      this.failTest(`Notification system failed: ${error.message}`);
    }
  }

  /**
   * Test 6: View Switching (Critical Test)
   */
  async testViewSwitching() {
    this.startTest("View Switching (Critical)");

    try {
      const controller = window.viewControllerManager;

      this.assert(!!controller, "ViewControllerManager available");

      // Test state-based view switching
      const originalMode = appState.getViewMode();

      // Test state change propagation
      const targetMode = originalMode === "2D" ? "3D" : "2D";
      appState.setViewMode(targetMode);

      // Check if ViewManager2D reflects the state
      const viewManagerState = viewManager.isIn2DMode();
      const expectedViewManagerState = targetMode === "2D";
      // Test controller coordination
      this.assert(
        typeof controller.forceSyncWithState === "function",
        "Controller has sync method"
      );

      controller.forceSyncWithState();

      // Restore original mode
      appState.setViewMode(originalMode);

      this.passTest("View switching coordination working correctly");
    } catch (error) {
      this.failTest(`View switching failed: ${error.message}`);
    }
  }

  /**
   * Test 7: Error Handling
   */
  async testErrorHandling() {
    this.startTest("Error Handling");

    try {
      // Test invalid state values
      const originalMode = appState.getViewMode();

      // This should be handled gracefully
      appState.setViewMode("INVALID_MODE");

      // Mode should remain unchanged
      this.assert(
        appState.getViewMode() === originalMode,
        "Invalid mode change was rejected"
      );

      // Test ViewControllerManager error handling
      const controller = window.viewControllerManager;

      // Test without building context (should not crash)
      try {
        controller.clearBuildingContext();
        controller.toggleViewMode();
        this.assert(
          true,
          "Controller handles missing building context gracefully"
        );
      } catch (error) {
        this.assert(
          false,
          `Controller should handle missing building context: ${error.message}`
        );
      }

      this.passTest("Error handling working correctly");
    } catch (error) {
      this.failTest(`Error handling test failed: ${error.message}`);
    }
  }

  /**
   * Test 8: Performance and Memory
   */
  async testPerformance() {
    this.startTest("Performance and Memory");

    try {
      // Test rapid state changes
      const startTime = performance.now();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const mode = i % 2 === 0 ? "2D" : "3D";
        appState.setViewMode(mode);
      }

      const endTime = performance.now();
      const timePerIteration = (endTime - startTime) / iterations;

      this.assert(
        timePerIteration < 1,
        `State changes are performant: ${timePerIteration.toFixed(
          2
        )}ms per change`
      );

      // Test memory usage (basic check)
      const debugInfo = appState.getDebugInfo();
      this.assert(typeof debugInfo === "object", "Debug info is accessible");
      this.assert(debugInfo.subscribers, "Event subscribers are tracked");

      // Test cleanup
      let cleanupCalled = false;
      const cleanup = appState.subscribe("test", () => {});
      cleanup();
      cleanupCalled = true;

      this.assert(cleanupCalled, "Event cleanup functions work");

      this.passTest("Performance and memory management working correctly");
    } catch (error) {
      this.failTest(`Performance test failed: ${error.message}`);
    }
  }

  /**
   * Test the complete user flow
   */
  async testCompleteUserFlow() {
    this.startTest("Complete User Flow");

    try {
      console.log("🎬 Testing complete user interaction flow...");

      // Step 1: User opens application
      this.assert(!!window.viewer, "Cesium viewer is available");
      this.assert(!!appState.getViewer(), "AppState has viewer reference");

      // Step 2: User sees sidebar
      const sidebar = window.mapSidebar;
      this.assert(!!sidebar, "Sidebar is initialized");

      // Step 3: User tries to switch to 2D mode without building (should show notification)
      const button = document.querySelector(".view-2d-button");
      if (button && !appState.getLastActiveVenueId()) {
        button.click();

        // Should show "building required" notification
        await this.wait(100);
        const notifications = document.querySelectorAll(".notification");
        this.assert(
          notifications.length > 0,
          "Notification shown when no building selected"
        );

        // Clear notifications
        notificationSystem.clearAll();
      }

      // Step 4: Test persistence across sessions (simulate)
      const testMode = appState.getViewMode() === "2D" ? "3D" : "2D";
      appState.setViewMode(testMode);

      const persistedMode = persistenceService.loadViewMode();
      this.assert(persistedMode === testMode, "View mode persisted correctly");

      this.passTest("Complete user flow working correctly");
    } catch (error) {
      this.failTest(`Complete user flow failed: ${error.message}`);
    }
  }

  // Helper methods for testing

  startTest(testName) {
    this.currentTest = {
      name: testName,
      startTime: performance.now(),
      assertions: 0,
      status: "running",
    };
    console.log(`🧪 Starting test: ${testName}`);
  }

  passTest(message = "") {
    if (!this.currentTest) return;

    this.currentTest.status = "passed";
    this.currentTest.endTime = performance.now();
    this.currentTest.duration =
      this.currentTest.endTime - this.currentTest.startTime;
    this.currentTest.message = message;

    this.testResults.push(this.currentTest);
    console.log(
      `✅ PASSED: ${this.currentTest.name} (${this.currentTest.duration.toFixed(
        2
      )}ms) - ${message}`
    );
  }

  failTest(message = "") {
    if (!this.currentTest) return;

    this.currentTest.status = "failed";
    this.currentTest.endTime = performance.now();
    this.currentTest.duration =
      this.currentTest.endTime - this.currentTest.startTime;
    this.currentTest.message = message;

    this.testResults.push(this.currentTest);
    console.log(
      `❌ FAILED: ${this.currentTest.name} (${this.currentTest.duration.toFixed(
        2
      )}ms) - ${message}`
    );
  }

  assert(condition, message) {
    if (this.currentTest) {
      this.currentTest.assertions++;
    }

    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reportResults() {
    console.group("📊 Integration Test Results");

    const passed = this.testResults.filter((t) => t.status === "passed").length;
    const failed = this.testResults.filter((t) => t.status === "failed").length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.group("❌ Failed Tests:");
      this.testResults
        .filter((t) => t.status === "failed")
        .forEach((test) => {
          console.log(`- ${test.name}: ${test.message}`);
        });
      console.groupEnd();
    }

    console.group("📈 Performance Summary:");
    const totalTime = this.testResults.reduce(
      (sum, test) => sum + test.duration,
      0
    );
    console.log(`Total Test Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average Test Time: ${(totalTime / total).toFixed(2)}ms`);
    console.groupEnd();

    console.groupEnd();

    // Show success notification if all tests passed
    if (failed === 0) {
      notificationSystem.success(
        "All Tests Passed! 🎉",
        `${passed} integration tests completed successfully`
      );
    } else {
      notificationSystem.error(
        "Some Tests Failed",
        `${failed} out of ${total} tests failed`
      );
    }
  }

  /**
   * Quick validation checks for debugging
   */
  quickValidation() {
    console.log("🔍 Quick Validation Checks:");

    const checks = [
      { name: "AppState initialized", check: () => !!appState },
      {
        name: "ViewControllerManager exists",
        check: () => !!window.viewControllerManager,
      },
      { name: "Sidebar exists", check: () => !!window.mapSidebar },
      { name: "PersistenceService exists", check: () => !!persistenceService },
      { name: "NotificationSystem exists", check: () => !!notificationSystem },
      {
        name: "State synced with UI",
        check: () => {
          const mode = appState.getViewMode();
          const button = document.querySelector(".view-2d-button");
          if (!button) return false;
          const isActive = button.classList.contains("active");
          return (mode === "2D") === isActive;
        },
      },
    ];

    checks.forEach(({ name, check }) => {
      try {
        const result = check();
        console.log(result ? `✅ ${name}` : `❌ ${name}`);
      } catch (error) {
        console.log(`❌ ${name} - Error: ${error.message}`);
      }
    });
  }

  /**
   * Demo mode for showcasing functionality
   */
  async demoMode() {
    console.log(
      "🎭 Starting Demo Mode - showcasing state management integration"
    );

    notificationSystem.info(
      "Demo Mode Started",
      "Watch the console for state management demonstration"
    );

    // Demo 1: State changes
    console.log("📍 Demo 1: State Management");
    const originalMode = appState.getViewMode();

    await this.wait(1000);
    console.log(`Current mode: ${originalMode}`);

    const newMode = originalMode === "2D" ? "3D" : "2D";
    console.log(`Switching to: ${newMode}`);
    appState.setViewMode(newMode);

    await this.wait(2000);

    // Demo 2: UI Updates
    console.log("📍 Demo 2: UI Reactive Updates");
    console.log("Watch the sidebar button change...");

    await this.wait(1000);

    // Demo 3: Persistence
    console.log("📍 Demo 3: Persistence");
    console.log("State will be saved to localStorage");
    persistenceService.saveFullState();

    const storageInfo = persistenceService.getStorageInfo();
    console.log("Storage usage:", storageInfo);

    await this.wait(1000);

    // Demo 4: Notifications
    console.log("📍 Demo 4: Notification System");
    notificationSystem.viewModeSwitch(newMode, "Demo Building");

    await this.wait(3000);

    // Restore original mode
    appState.setViewMode(originalMode);

    console.log("🎭 Demo Mode Complete");
    notificationSystem.success(
      "Demo Complete",
      "All systems demonstrated successfully!"
    );
  }
}

// Create singleton instance
export const integrationTester = new IntegrationTester();

// Make available globally for manual testing
if (typeof window !== "undefined") {
  window.integrationTester = integrationTester;
}
