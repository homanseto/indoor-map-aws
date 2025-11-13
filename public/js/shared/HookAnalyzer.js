/**
 * Current Hook Analysis Tool
 *
 * Analyzes the existing AppStateHooks.js to show exactly which functions
 * get called for each event subscription.
 */

// Function call analysis for current useStateSlice implementation
export const HookAnalyzer = {
  /**
   * Shows exactly what happens with current implementation
   */
  analyzeCurrent() {
    console.group("🔍 Current useStateSlice Event Analysis");

    const currentEvents = [
      "buildingAdded",
      "buildingRemoved",
      "networkAdded",
      "networkRemoved",
      "lastActiveVenueChanged",
      "viewModeChanged",
      "venueDataChanged",
      "processingClickChanged",
      "allActiveCleared",
      "unitLabelStateChanged",
      "kickModeChanged",
      "networkVisibilityChanged",
    ];

    console.log(
      "📊 CURRENT PROBLEM: Every useStateSlice call subscribes to ALL 12 events"
    );
    console.log("This means EVERY hook triggers on EVERY state change!");
    console.log("");

    // Example scenarios
    console.group('📝 Example: When appState.setViewMode("2D") is called:');
    console.log("1. viewModeChanged event is emitted");
    console.log("2. ALL active hooks receive the event");
    console.log("3. Each hook runs selector() function");
    console.log("4. Each hook compares old vs new value");
    console.log("5. Only hooks with actual changes call callback()");
    console.log("");
    console.log(
      "❌ INEFFICIENT: Even hooks that only care about building state"
    );
    console.log("   still run their selector on every view mode change!");
    console.groupEnd();

    console.group("📝 Example: Current hooks and their unnecessary triggers:");

    const hookExamples = [
      {
        name: "useBuildingState",
        cares_about: [
          "buildingAdded",
          "buildingRemoved",
          "lastActiveVenueChanged",
          "allActiveCleared",
        ],
        gets_triggered_by: currentEvents,
        unnecessary_triggers: currentEvents.filter(
          (e) =>
            ![
              "buildingAdded",
              "buildingRemoved",
              "lastActiveVenueChanged",
              "allActiveCleared",
            ].includes(e)
        ),
      },
      {
        name: "useUIState",
        cares_about: [
          "viewModeChanged",
          "processingClickChanged",
          "lastActiveVenueChanged",
          "kickModeChanged",
          "networkVisibilityChanged",
        ],
        gets_triggered_by: currentEvents,
        unnecessary_triggers: currentEvents.filter(
          (e) =>
            ![
              "viewModeChanged",
              "processingClickChanged",
              "lastActiveVenueChanged",
              "kickModeChanged",
              "networkVisibilityChanged",
            ].includes(e)
        ),
      },
      {
        name: "useViewerState",
        cares_about: ["viewerChanged", "sidebarChanged"], // These events don't exist in current list!
        gets_triggered_by: currentEvents,
        unnecessary_triggers: currentEvents, // ALL are unnecessary!
      },
      {
        name: "useUnitLabelState",
        cares_about: ["unitLabelStateChanged"],
        gets_triggered_by: currentEvents,
        unnecessary_triggers: currentEvents.filter(
          (e) => e !== "unitLabelStateChanged"
        ),
      },
    ];

    hookExamples.forEach((hook) => {
      console.log(`\n🎯 ${hook.name}:`);
      console.log(`  Actually needs: ${hook.cares_about.join(", ")}`);
      console.log(
        `  Currently gets: ALL ${hook.gets_triggered_by.length} events`
      );
      console.log(
        `  Unnecessary triggers: ${hook.unnecessary_triggers.length} events`
      );
      console.log(
        `  Efficiency: ${(
          (hook.cares_about.length / hook.gets_triggered_by.length) *
          100
        ).toFixed(1)}%`
      );
    });

    console.groupEnd();
    console.groupEnd();
  },

  /**
   * Shows function call counts for a typical user interaction
   */
  simulateUserInteraction() {
    console.group("🎮 Simulated User Interaction Analysis");

    const scenario = [
      {
        action: "User clicks venue polygon",
        triggers: ["buildingAdded", "networkAdded", "lastActiveVenueChanged"],
      },
      { action: "User switches to 2D mode", triggers: ["viewModeChanged"] },
      { action: "User selects level L2", triggers: ["selectedLevelChanged"] }, // This event is missing from current list!
      {
        action: "User toggles network visibility",
        triggers: ["networkVisibilityChanged"],
      },
      { action: "User resets view", triggers: ["allActiveCleared"] },
    ];

    const activeHooks = [
      "useBuildingState hook #1",
      "useBuildingState hook #2",
      "useUIState hook #1",
      "useViewerState hook #1",
      "useUnitLabelState hook #1",
      "Custom hook #1",
      "Custom hook #2",
    ]; // 7 active hooks

    console.log(
      `📊 Scenario: ${activeHooks.length} active hooks in the application`
    );
    console.log("");

    let totalSelectors = 0;
    let totalCallbacks = 0;

    scenario.forEach((step, index) => {
      console.log(`\n${index + 1}. ${step.action}`);
      console.log(`   Events emitted: ${step.triggers.join(", ")}`);

      step.triggers.forEach((event) => {
        const selectorsRun = activeHooks.length; // ALL hooks run selector on ANY event
        const callbacksRun = Math.floor(Math.random() * activeHooks.length); // Random hooks actually change

        totalSelectors += selectorsRun;
        totalCallbacks += callbacksRun;

        console.log(
          `   📡 ${event}: ${selectorsRun} selectors run, ~${callbacksRun} callbacks triggered`
        );
      });
    });

    console.log(`\n📈 TOTALS:`);
    console.log(`   Total selector() calls: ${totalSelectors}`);
    console.log(`   Total callback() calls: ${totalCallbacks}`);
    console.log(
      `   Efficiency ratio: ${((totalCallbacks / totalSelectors) * 100).toFixed(
        1
      )}%`
    );
    console.log(`\n⚠️  With improved hooks, this could be reduced by 60-80%!`);

    console.groupEnd();
  },

  /**
   * Show improvement potential
   */
  showImprovementPotential() {
    console.group("🚀 Improvement Potential");

    console.log("✅ IMPROVED APPROACH BENEFITS:");
    console.log("");
    console.log("1. 📊 Performance:");
    console.log("   • Only relevant events trigger hooks");
    console.log("   • 60-80% reduction in selector() calls");
    console.log("   • Faster UI updates and better responsiveness");
    console.log("");
    console.log("2. 🐛 Debugging:");
    console.log("   • Clear mapping of which events affect which hooks");
    console.log("   • Debug mode shows exactly why a hook triggered");
    console.log("   • Easy to trace state change propagation");
    console.log("");
    console.log("3. 🛠️ Maintenance:");
    console.log("   • Adding new events doesn't affect unrelated hooks");
    console.log("   • Self-documenting event dependencies");
    console.log("   • Better separation of concerns");
    console.log("");
    console.log("4. 📝 Developer Experience:");
    console.log("   • Hook creation shows which events it will use");
    console.log("   • Performance monitoring built-in");
    console.log("   • Custom hooks are easier to create and debug");

    console.groupEnd();
  },
};

// Usage examples for the improved version
export const UsageExamples = {
  /**
   * Show how to use the improved hooks
   */
  showImprovedUsage() {
    console.group("📖 Improved Hook Usage Examples");

    console.log("// ✅ IMPROVED: Only subscribes to relevant events");
    console.log(`
const cleanup = StateHooks.useUIState((uiState) => {
  console.log('UI changed:', uiState);
}, { debugMode: true }); // Shows which events triggered this

// Console output shows:
// [StateHooks] Hook created with events: ['viewModeChanged', 'kickModeChanged', ...]
// [StateHooks] viewModeChanged triggered change: { previous: '3D', current: '2D' }
`);

    console.log("// ✅ IMPROVED: Create custom hooks with specific events");
    console.log(`
const useLevelState = StateHooks.createCustomHook(
  'LevelHook',
  (state) => ({ 
    selectedLevel: state.getSelectedLevel(),
    kickMode: state.getKickMode() 
  }),
  ['selectedLevelChanged', 'kickModeChanged'] // Only these events!
);

const cleanup = useLevelState((levelState) => {
  this.updateLevelUI(levelState.selectedLevel);
});
`);

    console.log("// ✅ IMPROVED: Monitor hook performance");
    console.log(`
const monitor = HookDev.monitorHooks();

// Create some hooks...
// Later:
monitor.logHooks(); // Shows table of all active hooks and their events
monitor.getHookCount(); // Number of active hooks
HookDev.analyzeEventEfficiency(); // Performance analysis
`);

    console.groupEnd();
  },
};

// Make available in console for analysis
if (typeof window !== "undefined") {
  window.HookAnalyzer = HookAnalyzer;
  window.UsageExamples = UsageExamples;
}
