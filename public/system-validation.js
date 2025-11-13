/**
 * 🔬 Comprehensive System Validation Commands
 *
 * Complete testing suite to verify SSOT compliance, enhanced hooks performance,
 * and overall system integrity across the entire 3D Indoor Map Viewer application.
 *
 * Run these commands in the browser console to validate everything is working correctly.
 */

// =============================================================================
// 📋 QUICK START COMMANDS - Copy and paste these into your browser console
// =============================================================================

console.log(`
🚀 COMPREHENSIVE SYSTEM VALIDATION COMMANDS
===========================================

📌 QUICK VALIDATION (Copy these commands):

// 1. Basic System Check
window.validateSystem = function() {
  console.group('🔍 System Validation');
  console.log('✓ AppState available:', typeof window.appState);
  console.log('✓ StateHooks available:', typeof window.StateHooks);
  console.log('✓ Enhanced tools available:', typeof window.HookDev);
  console.log('✓ Current state:', window.appState?.getStatus());
  console.groupEnd();
};

// 2. Enhanced Hooks Performance Test
window.testEnhancedHooks = function() {
  console.group('⚡ Enhanced Hooks Test');
  
  // Test intelligent event detection
  const cleanup = window.StateHooks.useStateSlice(
    (state) => ({ mode: state.getViewMode(), venue: state.getLastActiveVenueId() }),
    (newValue, oldValue, event) => console.log('Hook triggered:', event, newValue),
    { debugMode: true, name: 'TestHook' }
  );
  
  const events = cleanup.events || cleanup.debug?.events || [];
  console.log('✓ Detected events:', events);
  console.log('✓ Expected: viewModeChanged, lastActiveVenueChanged');
  console.log('✓ Intelligent detection:', events.length <= 4 ? 'PASS' : 'FAIL');
  
  // Trigger test changes
  window.appState.setViewMode('2D');
  setTimeout(() => window.appState.setViewMode('3D'), 100);
  setTimeout(() => cleanup(), 200);
  
  console.groupEnd();
};

// 3. SSOT Compliance Check
window.checkSSOTCompliance = function() {
  console.group('🎯 SSOT Compliance Check');
  
  // Check for duplicate state
  const duplicateChecks = [
    { file: 'AppState.js', check: () => typeof window.appState?.getViewMode === 'function' },
    { file: 'BuildingIndoor', check: () => !window.BuildingIndoor?.prototype?.viewMode },
    { file: 'IndoorNetwork', check: () => !window.IndoorNetwork?.prototype?.networkVisible }
  ];
  
  duplicateChecks.forEach(({file, check}) => {
    const result = check();
    console.log(\`✓ \${file} SSOT compliance: \${result ? 'PASS' : 'FAIL'}\`);
  });
  
  console.groupEnd();
};

// 4. Performance Monitoring
window.startPerformanceMonitoring = function() {
  if (window.performanceMonitor) {
    console.log('⚠️ Performance monitoring already active');
    return window.performanceMonitor;
  }
  
  console.log('📊 Starting performance monitoring...');
  window.performanceMonitor = window.HookDev.monitorHooks();
  
  // Auto-report every 10 seconds
  window.performanceInterval = setInterval(() => {
    console.group('📈 Performance Report');
    window.performanceMonitor.logHooks();
    window.performanceMonitor.logPerformance();
    console.groupEnd();
  }, 10000);
  
  return window.performanceMonitor;
};

// 5. Stop Performance Monitoring
window.stopPerformanceMonitoring = function() {
  if (window.performanceMonitor) {
    window.performanceMonitor.stopMonitoring();
    window.performanceMonitor = null;
  }
  if (window.performanceInterval) {
    clearInterval(window.performanceInterval);
    window.performanceInterval = null;
  }
  console.log('🛑 Performance monitoring stopped');
};

// 6. Complete System Test
window.runCompleteSystemTest = async function() {
  console.log('🔬 Starting Complete System Test...');
  
  console.log('1/6 System validation...');
  window.validateSystem();
  
  console.log('2/6 SSOT compliance...');
  window.checkSSOTCompliance();
  
  console.log('3/6 Enhanced hooks test...');
  window.testEnhancedHooks();
  
  console.log('4/6 Event efficiency analysis...');
  window.HookDev.analyzeEventEfficiency();
  
  console.log('5/6 Performance stress test...');
  window.HookDev.performanceTest();
  
  console.log('6/6 State monitoring...');
  const monitor = window.StateDev.monitorStateChanges();
  
  console.log('✅ Complete system test finished!');
  console.log('📊 Monitoring active for 30 seconds...');
  
  setTimeout(() => {
    monitor();
    console.log('🎉 All tests completed successfully!');
  }, 30000);
};

RUN THESE COMMANDS:
==================
validateSystem()              // Quick system check
testEnhancedHooks()           // Test intelligent event detection
checkSSOTCompliance()         // Verify no duplicate state
HookDev.analyzeEventEfficiency() // Test event optimization
HookDev.performanceTest()     // Stress test performance
runCompleteSystemTest()       // Run everything
`);

// Export validation functions
if (typeof window !== "undefined") {
  // Make all validation functions globally available
  const validationFunctions = {
    validateSystem,
    testEnhancedHooks,
    checkSSOTCompliance,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    runCompleteSystemTest,
  };

  Object.assign(window, validationFunctions);

  console.log(
    "✨ Validation commands loaded! Type any command above to run tests."
  );
}
