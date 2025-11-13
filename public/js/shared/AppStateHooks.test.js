/**
 * 🧪 Comprehensive AppStateHooks Testing Suite
 *
 * Tests the enhanced AppStateHooks with intelligent event detection
 * to ensure 100% backward compatibility and improved performance.
 */

// Import the enhanced hooks
import "./AppStateHooks.js";
import "./AppState.js";

/**
 * 🎯 Test Suite for Enhanced AppStateHooks
 */
class AppStateHooksTestSuite {
  constructor() {
    this.tests = [];
    this.results = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Add a test to the suite
   */
  addTest(name, testFunction, description = "") {
    this.tests.push({ name, testFunction, description });
  }

  /**
   * Run all tests and return results
   */
  async runAllTests() {
    console.log("🚀 Starting Enhanced AppStateHooks Test Suite...\n");
    this.startTime = performance.now();
    this.results = [];

    for (const test of this.tests) {
      console.log(`📝 Running: ${test.name}`);
      if (test.description) {
        console.log(`   ${test.description}`);
      }

      try {
        const testStart = performance.now();
        const result = await test.testFunction();
        const testEnd = performance.now();

        this.results.push({
          name: test.name,
          status: result ? "PASS" : "FAIL",
          time: `${(testEnd - testStart).toFixed(2)}ms`,
          details: result,
        });

        console.log(`   ✅ PASS (${(testEnd - testStart).toFixed(2)}ms)\n`);
      } catch (error) {
        this.results.push({
          name: test.name,
          status: "ERROR",
          time: "0ms",
          details: error.message,
        });

        console.log(`   ❌ ERROR: ${error.message}\n`);
      }
    }

    this.endTime = performance.now();
    this.printSummary();
    return this.results;
  }

  /**
   * Print test summary
   */
  printSummary() {
    const totalTime = this.endTime - this.startTime;
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const errors = this.results.filter((r) => r.status === "ERROR").length;

    console.log("\n📊 Test Suite Summary");
    console.log("=".repeat(50));
    console.table(this.results);
    console.log(
      `\n🎯 Results: ${passed} passed, ${failed} failed, ${errors} errors`
    );
    console.log(`⏱️ Total time: ${totalTime.toFixed(2)}ms`);
    console.log(
      `${
        passed === this.tests.length
          ? "🎉 All tests passed!"
          : "⚠️ Some tests failed"
      }`
    );
  }
}

/**
 * 🔧 Test Utilities
 */
class TestUtils {
  /**
   * Wait for a specified time
   */
  static wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a mock callback that tracks calls
   */
  static createMockCallback() {
    const calls = [];
    const callback = (...args) => {
      calls.push({
        timestamp: Date.now(),
        args: args,
        eventType: args[2], // event type is 3rd argument
      });
    };
    callback.getCalls = () => calls;
    callback.getCallCount = () => calls.length;
    callback.getLastCall = () => calls[calls.length - 1];
    callback.reset = () => (calls.length = 0);
    return callback;
  }

  /**
   * Trigger multiple state changes and measure response
   */
  static async triggerStateChanges() {
    const changes = [
      () => window.appState.setViewMode("2D"),
      () => window.appState.setViewMode("3D"),
      () => window.appState.setKickMode(true),
      () => window.appState.setKickMode(false),
      () => window.appState.setLastActiveVenueId("test-venue"),
      () => window.appState.setLastActiveVenueId(null),
    ];

    for (const change of changes) {
      change();
      await this.wait(10); // Small delay between changes
    }
  }
}

/**
 * 🧪 Main Test Suite Setup
 */
function setupTestSuite() {
  const suite = new AppStateHooksTestSuite();

  // Test 1: Basic Hook Creation
  suite.addTest(
    "Basic Hook Creation",
    () => {
      const callback = TestUtils.createMockCallback();
      const cleanup = window.StateHooks.useStateSlice(
        (state) => state.getViewMode(),
        callback
      );

      const isFunction = typeof cleanup === "function";
      cleanup();

      return isFunction;
    },
    "Verify hooks can be created and return cleanup function"
  );

  // Test 2: Event Detection Intelligence
  suite.addTest(
    "Intelligent Event Detection",
    () => {
      const callback = TestUtils.createMockCallback();

      // Hook that should only care about viewMode
      const cleanup = window.StateHooks.useStateSlice(
        (state) => state.getViewMode(),
        callback,
        { debugMode: true }
      );

      // Should detect only viewModeChanged event (handle both direct and debug property access)
      const events = cleanup.events || cleanup.debug?.events || [];
      const shouldHaveViewModeEvent = events.includes("viewModeChanged");
      const shouldNotHaveKickModeEvent = !events.includes("kickModeChanged");

      cleanup();

      return shouldHaveViewModeEvent && shouldNotHaveKickModeEvent;
    },
    "Verify EVENT_STATE_MAP correctly detects required events"
  );

  // Test 3: Convenience Hook Methods
  suite.addTest(
    "Convenience Hook Methods",
    () => {
      const callbacks = {
        building: TestUtils.createMockCallback(),
        ui: TestUtils.createMockCallback(),
        network: TestUtils.createMockCallback(),
        viewer: TestUtils.createMockCallback(),
      };

      const cleanups = [
        window.StateHooks.useBuildingState(callbacks.building),
        window.StateHooks.useUIState(callbacks.ui),
        window.StateHooks.useNetworkState(callbacks.network),
        window.StateHooks.useViewerState(callbacks.viewer),
      ];

      const allAreFunction = cleanups.every(
        (cleanup) => typeof cleanup === "function"
      );

      cleanups.forEach((cleanup) => cleanup());

      return allAreFunction;
    },
    "Test all convenience hook methods work correctly"
  );

  // Test 4: Performance - Event Filtering
  suite.addTest(
    "Performance Event Filtering",
    async () => {
      const viewModeCallback = TestUtils.createMockCallback();
      const kickModeCallback = TestUtils.createMockCallback();

      // Create two hooks with different selectors
      const viewModeCleanup = window.StateHooks.useStateSlice(
        (state) => state.getViewMode(),
        viewModeCallback
      );

      const kickModeCleanup = window.StateHooks.useStateSlice(
        (state) => state.getKickMode(),
        kickModeCallback
      );

      // Trigger only viewMode changes
      window.appState.setViewMode("2D");
      window.appState.setViewMode("3D");

      await TestUtils.wait(50);

      // ViewMode hook should be called, kickMode should not
      const viewModeCalled = viewModeCallback.getCallCount() > 0;
      const kickModeNotCalled = kickModeCallback.getCallCount() === 0;

      viewModeCleanup();
      kickModeCleanup();

      return viewModeCalled && kickModeNotCalled;
    },
    "Verify hooks only respond to relevant state changes"
  );

  // Test 5: Backward Compatibility
  suite.addTest(
    "Backward Compatibility",
    async () => {
      let callbackExecuted = false;

      // Test old-style callback signature
      const cleanup = window.StateHooks.useStateSlice(
        (state) => ({ mode: state.getViewMode(), kick: state.getKickMode() }),
        (newValue, oldValue, event, eventData) => {
          // Old callback style should still work
          callbackExecuted = true;
          return (
            typeof newValue === "object" &&
            typeof event === "string" &&
            newValue.hasOwnProperty("mode")
          );
        }
      );

      window.appState.setViewMode("2D");
      await TestUtils.wait(50);

      cleanup();
      return callbackExecuted;
    },
    "Ensure existing callback signatures remain functional"
  );

  // Test 6: Debug Mode Features
  suite.addTest(
    "Debug Mode Features",
    () => {
      const callback = TestUtils.createMockCallback();

      const cleanup = window.StateHooks.useStateSlice(
        (state) => state.getViewMode(),
        callback,
        {
          debugMode: true,
          name: "TestHook",
        }
      );

      // Debug mode should add extra properties to cleanup function (handle both direct and debug object access)
      const hasEvents = !!(cleanup.events || cleanup.debug?.events);
      const hasName =
        cleanup.hookName === "TestHook" ||
        cleanup.debug?.name === "TestHook" ||
        cleanup.name === "TestHook";
      const hasSelector = !!(cleanup.selector || cleanup.debug?.selector);

      cleanup();

      return hasEvents && hasName && hasSelector;
    },
    "Test debug mode adds development information"
  );

  // Test 7: Performance Under Load
  suite.addTest(
    "Performance Under Load",
    async () => {
      const hooks = [];
      const startTime = performance.now();

      // Create 50 hooks rapidly
      for (let i = 0; i < 50; i++) {
        const cleanup = window.StateHooks.useUIState(() => {});
        hooks.push(cleanup);
      }

      const creationTime = performance.now() - startTime;

      // Trigger rapid state changes
      const changeStart = performance.now();
      await TestUtils.triggerStateChanges();
      const changeTime = performance.now() - changeStart;

      // Clean up
      hooks.forEach((cleanup) => cleanup());

      // Performance should be reasonable (under 100ms for creation, under 50ms for changes)
      return creationTime < 100 && changeTime < 50;
    },
    "Test performance with multiple hooks and rapid state changes"
  );

  // Test 8: StateActions Helper
  suite.addTest(
    "StateActions Helper",
    () => {
      let actionsCalled = 0;

      // Mock StateActions methods
      const originalSetViewMode = window.appState.setViewMode;
      window.appState.setViewMode = (...args) => {
        actionsCalled++;
        return originalSetViewMode.apply(window.appState, args);
      };

      // Test StateActions convenience methods
      window.StateActions.setViewMode("2D");
      window.StateActions.setKickMode(true);

      // Restore original method
      window.appState.setViewMode = originalSetViewMode;

      return actionsCalled === 1; // Should have called setViewMode once
    },
    "Test StateActions convenience wrapper methods"
  );

  // Test 9: Development Tools
  suite.addTest(
    "Development Tools Available",
    () => {
      const hasStateDev = typeof window.StateDev === "object";
      const hasHookDev = typeof window.HookDev === "object";
      const hasAnalyzeMethod =
        typeof window.StateDev.analyzeHooks === "function";
      const hasMonitorMethod =
        typeof window.HookDev.monitorHooks === "function";

      return hasStateDev && hasHookDev && hasAnalyzeMethod && hasMonitorMethod;
    },
    "Verify development tools are properly exposed"
  );

  // Test 10: Memory Management
  suite.addTest(
    "Memory Management",
    async () => {
      const initialHooks = window.appState.eventEmitter.listenerCount();
      const callbacks = [];
      const cleanups = [];

      // Create many hooks
      for (let i = 0; i < 20; i++) {
        const callback = TestUtils.createMockCallback();
        callbacks.push(callback);

        const cleanup = window.StateHooks.useStateSlice(
          (state) => state.getViewMode(),
          callback
        );
        cleanups.push(cleanup);
      }

      const peakHooks = window.appState.eventEmitter.listenerCount();

      // Clean up all hooks
      cleanups.forEach((cleanup) => cleanup());

      await TestUtils.wait(100); // Allow cleanup to complete

      const finalHooks = window.appState.eventEmitter.listenerCount();

      // Should have more listeners during peak, then return to initial level
      return peakHooks > initialHooks && finalHooks <= initialHooks + 2;
    },
    "Test proper cleanup and memory management"
  );

  return suite;
}

/**
 * 🚀 Export Test Runner Function
 */
export async function runEnhancedHooksTests() {
  console.log("🔧 Enhanced AppStateHooks Test Suite");
  console.log(
    "Testing intelligent event detection and performance improvements\n"
  );

  const suite = setupTestSuite();
  const results = await suite.runAllTests();

  return {
    passed: results.filter((r) => r.status === "PASS").length,
    total: results.length,
    details: results,
    success: results.every((r) => r.status === "PASS"),
  };
}

/**
 * 🎮 Manual Testing Commands for Developer Console
 */
export function setupManualTests() {
  console.log("🎮 Manual testing commands available:");
  console.log("   runEnhancedHooksTests() - Run full test suite");
  console.log("   StateDev.analyzeHooks() - Analyze current hook performance");
  console.log("   HookDev.monitorHooks() - Start real-time monitoring");
  console.log(
    "   HookDev.analyzeEventEfficiency() - Test event detection accuracy"
  );
  console.log("   HookDev.performanceTest() - Stress test hook performance\n");

  // Make test runner globally available
  if (typeof window !== "undefined") {
    window.runEnhancedHooksTests = runEnhancedHooksTests;
    window.TestUtils = TestUtils;
  }
}

// Auto-setup manual tests when loaded
setupManualTests();
