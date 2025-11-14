// ZClippingManager utility for modular Z-clipping logic
// Usage: ZClippingManager.applyToAllBuildings(activeBuildings, zValue)
export const ZClippingManager = {
  // Applies Z-clipping to all loaded BuildingIndoor instances
  applyToAllBuildings(activeBuildings, activeNetworks, zValue) {
    activeBuildings.forEach((buildingIndoor) => {
      if (
        buildingIndoor &&
        typeof buildingIndoor.applyZClipping === "function"
      ) {
        buildingIndoor.applyZClipping(zValue);
      }
    });
    activeNetworks.forEach((network) => {
      if (network && typeof network.applyZClipping === "function") {
        network.applyZClipping(zValue);
      }
    });
  },
};

export const OpacityControl = {
  // Store element references
  opacitySlider: null,
  opacityValue: null,
  opacityFill: null,

  // 3D Buildings Opacity Control
  initOpacityControl() {
    // Initialize element references
    this.opacitySlider = document.getElementById("opacity-slider");
    this.opacityValue = document.getElementById("opacity-value");
    this.opacityFill = document.getElementById("opacity-fill");

    if (!this.opacitySlider || !this.opacityValue || !this.opacityFill) {
      console.warn("[OpacityControl] Opacity control elements not found");
      return;
    }

    // Store 'this' reference for event handlers
    const self = this;

    // Handle slider input
    this.opacitySlider.addEventListener("input", (event) => {
      const percentage = parseInt(event.target.value);
      self.updateOpacityDisplay(percentage); // Use 'self' instead of 'this'
    });

    // Handle slider change (when user releases)
    this.opacitySlider.addEventListener("change", (event) => {
      const percentage = parseInt(event.target.value);
      const opacity = percentage / 100; // Convert to 0-1 range

      console.log(
        `[OpacityControl] Opacity changed to: ${opacity} (${percentage}%)`
      );
      // Connect to AppState - UPDATE THIS SECTION
      if (
        window.appState &&
        typeof window.appState.setTilesetOpacity === "function"
      ) {
        window.appState.setTilesetOpacity("threeDTiles", opacity);
        console.log(
          `[OpacityControl] Set threeDTiles opacity to: ${opacity} (${percentage}%)`
        );
      } else {
        console.warn("[OpacityControl] AppState not available");
        console.log(
          "Available appState methods:",
          window.appState
            ? Object.getOwnPropertyNames(window.appState)
            : "appState not found"
        );
      }
    });

    // Initialize display
    this.updateOpacityDisplay(50); // Default 50%
    console.log("[OpacityControl] Initialized successfully");
  },

  updateOpacityDisplay(percentage) {
    // Check if elements are available
    if (!this.opacityValue || !this.opacityFill) {
      console.warn("[OpacityControl] Elements not initialized");
      return;
    }

    // Update percentage text
    this.opacityValue.textContent = `${percentage}%`;

    // Update slider fill
    this.opacityFill.style.width = `${percentage}%`;
  },
};
