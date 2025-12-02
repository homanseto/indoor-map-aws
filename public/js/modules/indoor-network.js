import { indoorStyles } from "../utils/indoorStyles.js";
import { customizeEntityDisplayInfo } from "../utils/informationBox.js";
import { appState } from "../shared/AppState.js";

export class IndoorNetwork {
  constructor(viewer, networkData) {
    this.viewer = viewer;
    this.networkData = networkData;
    this.style = indoorStyles.indoorNetwork;

    // Remove local networkVisible - now managed by AppState (SSOT)
    // this.networkVisible = true; (SSOT violation removed)

    this.toggleButtonEl = null; // Reference to the toggle button element

    // Subscribe to barrier changes to update color dynamically
    if (appState && typeof appState.subscribe === "function") {
      appState.subscribe("wheelchairBarrierChanged", (data) => {
        this.updateBarrierStyle(data.current);
      });
    }
  }

  async show() {
    if (
      !this.networkData.success ||
      !this.networkData.result.featureCollection
    ) {
      console.error("Invalid network data");
      return;
    }
    this.dataSources = {};
    const featureCollection = this.networkData.result.featureCollection;
    if (featureCollection.features.length === 0) {
      console.warn("No features in network data");
      return;
    }
    const styledFeatures = featureCollection.features.map((feature) => {
      const restricted = feature.properties.restricted;

      let style = this.style[restricted];
      if (!style) {
        style = this.style["Y"];
      }
      // Tag the feature if it is a wheelchair barrier
      feature._isBarrier = feature.properties.Wheelchairbarrier === 1;

      feature._indoorStyle = style;
      return feature;
    });
    const dataSource = await Cesium.GeoJsonDataSource.load(
      {
        type: "FeatureCollection",
        features: styledFeatures,
      },
      {
        // Styling will be applied per-entity below
      }
    );
    dataSource.entities.values.forEach((entity, i) => {
      const style = styledFeatures[i]._indoorStyle;

      entity._isBarrier = styledFeatures[i]._isBarrier;
      if (style) {
        entity.polyline.material = style.stroke;

        entity._defaultMaterial = style.stroke;
      }
    });
    this.viewer.dataSources.add(dataSource);
    this.dataSources["Indoor-network"] = dataSource;
    // Apply current barrier state immediately in case the toggle is already ON
    if (
      appState &&
      typeof appState.getWheelchairBarrierVisible === "function"
    ) {
      this.updateBarrierStyle(appState.getWheelchairBarrierVisible());
    }
  }

  // Apply Z-value clipping to all building entities (all feature types)
  applyZClipping(maxZ) {
    // If network is manually hidden, don't override with Z-clipping
    if (!appState.getNetworkVisible()) {
      return;
    }
    const areBarriersVisible = appState.getWheelchairBarrierVisible();

    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        // Try different ways to get positions from Cesium polyline
        try {
          let positions = null;
          if (entity.polyline.positions) {
            if (typeof entity.polyline.positions.getValue === "function") {
              positions = entity.polyline.positions.getValue(
                viewer.clock.currentTime
              );
            } else if (Array.isArray(entity.polyline.positions)) {
              positions = entity.polyline.positions;
            } else if (entity.polyline.positions._value) {
              positions = entity.polyline.positions._value;
            }
          }

          if (positions && positions.length > 0) {
            let hasVisiblePoint = false;

            // Check each position in the linestring
            for (let i = 0; i < positions.length; i++) {
              try {
                const cartographic = Cesium.Cartographic.fromCartesian(
                  positions[i]
                );
                const heightInMeters = cartographic.height;

                // If any point is at or below the Z-clipping value, show the linestring
                if (heightInMeters <= maxZ) {
                  hasVisiblePoint = true;
                  break;
                }
              } catch (posError) {
                // If we can't convert this position, assume it's visible
                hasVisiblePoint = true;
                break;
              }
            }
            // Show if entityZ is not above maxZ, or if undetermined
            entity.show = hasVisiblePoint;
          } else {
            // Fallback: if we can't get positions, keep it visible
            entity.show = true;
          }
        } catch (error) {
          console.warn(
            "Error applying Z-clipping to building network entity:",
            error
          );
          // Fallback: keep it visible if there's an error
          entity.show = true;
        }
      });
    });
  }

  // Toggle network visibility
  toggleNetworkVisibility() {
    appState.setNetworkVisible(!appState.getNetworkVisible());
    this.updateNetworkVisibility();
    this.updateToggleButton();
  }

  // Show network
  showNetwork() {
    appState.setNetworkVisible(true);
    this.updateNetworkVisibility();
    this.updateToggleButton();
  }

  // Hide network
  hideNetwork() {
    appState.setNetworkVisible(false);
    this.updateNetworkVisibility();
    this.updateToggleButton();
  }

  // Update the actual visibility of network entities
  updateNetworkVisibility() {
    const isNetworkVisible = appState.getNetworkVisible();

    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        entity.show = isNetworkVisible;
      });
    });
  }

  updateBarrierStyle(showBarriers) {
    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        // Only affect barrier entities
        if (entity._isBarrier) {
          if (showBarriers) {
            // If toggle is ON: Change color to RED
            entity.polyline.material = Cesium.Color.RED;
          } else {
            // If toggle is OFF: Revert to default color (Green)
            if (entity._defaultMaterial) {
              entity.polyline.material = entity._defaultMaterial;
            }
          }
        }
      });
    });
  }
  // updateNetworkVisibility() {
  //   Object.values(this.dataSources || {}).forEach((ds) => {
  //     ds.entities.values.forEach((entity) => {
  //       entity.show = appState.getNetworkVisible();
  //     });
  //   });
  // }

  // Update toggle button appearance
  updateToggleButton() {
    // if (!this.toggleButtonEl) return;

    // if (appState.getNetworkVisible()) {
    //   this.toggleButtonEl.textContent = "Hide Network";
    //   this.toggleButtonEl.classList.remove("btn-outline-success");
    //   this.toggleButtonEl.classList.add("btn-success");
    // } else {
    //   this.toggleButtonEl.textContent = "Show Network";
    //   this.toggleButtonEl.classList.remove("btn-success");
    //   this.toggleButtonEl.classList.add("btn-outline-success");
    // }
    // Notify sidebar to update button state
    const sidebar = appState.getMapSidebar();
    if (sidebar && typeof sidebar.updateNetworkButtonState === "function") {
      sidebar.updateNetworkButtonState();
    }
  }

  // // Initialize network toggle button UI (positioned below level selection bar)
  // initNetworkToggle() {
  //   // Find the level bar container to position the button below it
  //   const levelBarContainer = document.getElementById("levelBarContainer");
  //   if (!levelBarContainer) {
  //     console.warn(
  //       "Level bar container not found, cannot create network toggle"
  //     );
  //     return;
  //   }

  //   // Create network toggle container
  //   let networkToggleContainer = document.getElementById(
  //     "networkToggleContainer"
  //   );
  //   if (!networkToggleContainer) {
  //     networkToggleContainer = document.createElement("div");
  //     networkToggleContainer.id = "networkToggleContainer";
  //     networkToggleContainer.className = "network-toggle-container mt-3 mb-2";
  //     networkToggleContainer.style.display = "flex";
  //     networkToggleContainer.style.flexDirection = "column";
  //     networkToggleContainer.style.alignItems = "center";

  //     // Insert after the level bar container
  //     levelBarContainer.parentNode.insertBefore(
  //       networkToggleContainer,
  //       levelBarContainer.nextSibling
  //     );
  //   } else {
  //     // Clear existing content
  //     networkToggleContainer.innerHTML = "";
  //   }

  //   // Create the toggle button
  //   this.toggleButtonEl = document.createElement("button");
  //   this.toggleButtonEl.className = "btn btn-success mb-2";
  //   this.toggleButtonEl.style.minWidth = "120px";
  //   this.toggleButtonEl.addEventListener("click", () => {
  //     this.toggleNetworkVisibility();
  //   });

  //   // Add button to container
  //   networkToggleContainer.appendChild(this.toggleButtonEl);

  //   // Initialize button state
  //   this.updateToggleButton();

  //   console.log("✅ Network toggle button initialized");
  // }

  // // Clean up network toggle UI
  // destroyNetworkToggle() {
  //   const networkToggleContainer = document.getElementById(
  //     "networkToggleContainer"
  //   );
  //   if (networkToggleContainer) {
  //     networkToggleContainer.remove();
  //   }
  //   this.toggleButtonEl = null;
  // }
}
