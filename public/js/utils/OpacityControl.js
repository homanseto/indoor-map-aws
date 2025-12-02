import { appState } from "../shared/AppState.js";

// ZClippingManager utility for modular Z-clipping logic
// Usage: ZClippingManager.applyToAllBuildings(activeBuildings, zValue)
// export const ZClippingManager = {
//   // Applies Z-clipping to all loaded BuildingIndoor instances
//   applyToAllBuildings(activeBuildings, activeNetworks, zValue) {
//     activeBuildings.forEach((buildingIndoor) => {
//       if (
//         buildingIndoor &&
//         typeof buildingIndoor.applyZClipping === "function"
//       ) {
//         buildingIndoor.applyZClipping(zValue);
//       }
//     });
//     activeNetworks.forEach((network) => {
//       if (network && typeof network.applyZClipping === "function") {
//         network.applyZClipping(zValue);
//       }
//     });
//   },
// };
export const BarrierControl = {
  initBarrierControl() {
    const toggle = document.getElementById("barrier-toggle");
    if (!toggle) {
      console.warn("[BarrierControl] Toggle element not found");
      return;
    }

    // Set initial state from AppState
    if (
      appState &&
      typeof appState.getWheelchairBarrierVisible === "function"
    ) {
      toggle.checked = appState.getWheelchairBarrierVisible();
    }

    // Listen for changes
    toggle.addEventListener("change", (e) => {
      const isVisible = e.target.checked;
      console.log(`[BarrierControl] Toggled to: ${isVisible}`);

      if (
        appState &&
        typeof appState.setWheelchairBarrierVisible === "function"
      ) {
        appState.setWheelchairBarrierVisible(isVisible);
      }
    });

    // Subscribe to external state changes (e.g. if changed from elsewhere)
    if (appState && typeof appState.subscribe === "function") {
      appState.subscribe("wheelchairBarrierChanged", (data) => {
        if (toggle.checked !== data.current) {
          toggle.checked = data.current;
        }
      });
    }
  },
};

export const OpacityControl = {
  // Store element references
  opacitySlider: null,
  opacityValue: null,
  opacityFill: null,

  // Discrete opacity values (0, 50, 60, 70, 80, 100)
  opacityValues: [0, 50, 60, 70, 80, 100],

  // 3D Buildings Opacity Control
  initOpacityControl() {
    // Initialize element references
    this.opacitySlider = document.getElementById("opacity-slider");
    this.opacityValue = document.getElementById("opacity-value");
    this.opacityFill = document.getElementById("opacity-fill");

    if (!this.opacitySlider || !this.opacityFill) {
      console.warn("[OpacityControl] Opacity control elements not found");
      return;
    }

    // Hide the percentage text element if it exists
    if (this.opacityValue) {
      this.opacityValue.style.display = "none";
    }

    // Configure slider for discrete values
    this.opacitySlider.min = 0;
    this.opacitySlider.max = this.opacityValues.length - 1;
    this.opacitySlider.step = 1;
    this.opacitySlider.value = 0; // Default to index 0

    // Store 'this' reference for event handlers
    const self = this;

    // Handle slider input
    this.opacitySlider.addEventListener("input", (event) => {
      const index = parseInt(event.target.value);
      const percentage = self.opacityValues[index];
      self.updateOpacityDisplay(percentage);
    });

    // Handle slider change (when user releases)
    this.opacitySlider.addEventListener("change", (event) => {
      const index = parseInt(event.target.value);
      const percentage = self.opacityValues[index];
      const opacity = percentage / 100; // Convert to 0-1 range

      console.log(
        `[OpacityControl] Opacity changed to: ${opacity} (${percentage})`
      );
      // Connect to AppState - UPDATE THIS SECTION
      if (appState && typeof appState.setTilesetOpacity === "function") {
        appState.setTilesetOpacity("threeDTiles", opacity);
        console.log(`[OpacityControl] Set threeDTiles opacity to: ${opacity}`);
      } else {
        console.warn("[OpacityControl] AppState not available");
        console.log(
          "Available appState methods:",
          appState ? Object.getOwnPropertyNames(appState) : "appState not found"
        );
      }
    });

    // Initialize display
    this.updateOpacityDisplay(this.opacityValues[1]); // Default to index 1
    console.log("[OpacityControl] Initialized successfully");
  },

  updateOpacityDisplay(percentage) {
    // Check if elements are available
    if (!this.opacityFill) {
      console.warn("[OpacityControl] Elements not initialized");
      return;
    }

    // Hide percentage text if element exists
    if (this.opacityValue) {
      this.opacityValue.style.display = "none";
    }

    // Update slider fill only (no text display)
    this.opacityFill.style.width = `${percentage}%`;
  },
};
