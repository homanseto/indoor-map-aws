import { appState } from "../shared/AppState.js";
import { StateHooks } from "../shared/AppStateHooks.js";
import { indoorStyles } from "../utils/indoorStyles.js";
import { customizeEntityDisplayInfo } from "../utils/informationBox.js";
// BuildingIndoor class for managing 3D building visualization
// This is a scaffold. You will need to implement methods based on your buildingData structure.

export class BuildingIndoor {
  constructor(viewer, buildingData, venueId) {
    this.stateCleanups = [];
    this.viewer = viewer;
    this.buildingData = buildingData;
    this.styles = indoorStyles;
    this.venueId = venueId;

    // Selection management
    this.selectedEntity = null;
    this.highlightEntity = null;

    // unit-labels
    this.unitLabelDataSource = null;

    // Create specific subscriptions for only view mode and kick mode changes
    const viewModeCleanup1 = appState.subscribe("viewModeChanged", (data) => {
      console.log(
        `[BuildingIndoor] View mode changed: ${data.oldMode} → ${data.newMode}`
      );
      this.handleViewModeStateChange({
        viewMode: data.newMode,
        kickMode: appState.getKickMode(),
      }).catch((error) => {
        console.error("Error in handleViewModeStateChange:", error);
      });
    });

    const viewModeCleanup2 = appState.subscribe("kickModeChanged", (data) => {
      console.log(
        `[BuildingIndoor] Kick mode changed: ${data.previous} → ${data.current}`
      );
      this.handleViewModeStateChange({
        viewMode: appState.getViewMode(),
        kickMode: data.current,
      }).catch((error) => {
        console.error("Error in handleViewModeStateChange:", error);
      });
    });
    this.stateCleanups.push(viewModeCleanup1);
    this.stateCleanups.push(viewModeCleanup2);

    // const unitLabelCleanup = StateHooks.useUnitLabelState((labelState) => {
    //   this.handleUnitLabelStateChange(labelState);
    // });
    // this.stateCleanups.push(unitLabelCleanup);

    // TODO: Initialize Cesium entities based on buildingData, using this.styles as needed
  }

  // Load and display all features as separate GeoJsonDataSources
  async show() {
    // Store references to each data source for later control
    this.dataSources = {};
    const featureTypes = [
      { dataKey: "units", styleKey: "unit" },
      { dataKey: "openings", styleKey: "opening" },
      { dataKey: "windows", styleKey: "window" },
      { dataKey: "amenities", styleKey: "amenity" },
      { dataKey: "occupants", styleKey: "occupant" },
    ];

    console.log(featureTypes);
    // Generate and add 3D walls for units
    console.log("Generating 3D walls for building units...");
    const wallEntities = this.generateUnitWalls();
    if (wallEntities.length > 0) {
      const wallDataSource = new Cesium.CustomDataSource("unit_walls");
      wallEntities.forEach((wallEntity) => {
        wallDataSource.entities.add(wallEntity);
      });
      this.viewer.dataSources.add(wallDataSource);
      this.dataSources["walls"] = wallDataSource;
      console.log(`Added ${wallEntities.length} wall entities to viewer`);
    }

    // Generate and add 3D doors for openings
    console.log("Generating 3D doors for building openings...");
    const doorEntities = this.generateOpeningDoors();
    if (doorEntities.length > 0) {
      const doorDataSource = new Cesium.CustomDataSource("opening_doors");
      // Get the original opening features for customization
      const openingFeatures = this.buildingData.openings.features;

      doorEntities.forEach((doorEntity, i) => {
        doorDataSource.entities.add(doorEntity);

        // Find the corresponding opening feature for this door
        const originalOpening = openingFeatures.find(
          (opening) => doorEntity.id === `door_${opening.id}`
        );

        if (originalOpening) {
          customizeEntityDisplayInfo(doorEntity, originalOpening);
        }
      });
      this.viewer.dataSources.add(doorDataSource);
      this.dataSources["doors"] = doorDataSource;
      console.log(`Added ${doorEntities.length} door entities to viewer`);
    }

    for (const { dataKey, styleKey } of featureTypes) {
      if (dataKey === "occupants") {
        console.log(dataKey);
      }
      const featureCollection = this.buildingData[dataKey];
      if (
        !featureCollection ||
        !featureCollection.features ||
        featureCollection.features.length === 0
      )
        continue;

      // For category-based styling (units, amenities), use category; for others, use styleKey directly
      if (
        styleKey === "unit" ||
        styleKey === "amenity" ||
        styleKey === "occupant"
      ) {
        const styledFeatures = featureCollection.features.map((feature) => {
          const category = feature.properties && feature.properties.category;
          let style = this.styles[styleKey] && this.styles[styleKey][category];
          if (!style) {
            style =
              this.styles[styleKey] && this.styles[styleKey]["unspecified"];
          }
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
          customizeEntityDisplayInfo(entity, styledFeatures[i]);
          if (style) {
            if (entity.billboard && style.image) {
              Object.assign(entity.billboard, style);
            }
            if (entity.polygon && style.fill) {
              entity.polygon.material = style.fill;
            }
            if (entity.polyline && style.stroke) {
              entity.polyline.material = style.stroke;
            }
          }
        });
        this.viewer.dataSources.add(dataSource);
        this.dataSources[dataKey] = dataSource;
      } else {
        // For other types, apply style from config directly
        const style = this.styles[styleKey];
        const dataSource = await Cesium.GeoJsonDataSource.load(
          featureCollection,
          style
        );
        this.viewer.dataSources.add(dataSource);
        this.dataSources[dataKey] = dataSource;
      }
    }
  }

  getVenueId() {
    return this.venueId;
  }

  /////unit-labels/////
  ensureUnitLabelDataSource() {
    if (!this.unitLabelDataSource) {
      this.unitLabelDataSource = new Cesium.CustomDataSource("unit_labels");
      this.viewer.dataSources.add(this.unitLabelDataSource);
    }
    return this.unitLabelDataSource;
  }

  removeUnitLabels() {
    if (this.unitLabelDataSource) {
      this.viewer.dataSources.remove(this.unitLabelDataSource);
      this.unitLabelDataSource = null;
    }
  }

  async handleViewModeStateChange(uiState) {
    const mode = uiState.viewMode;
    const kickMode = uiState.kickMode;

    // 🔥 KEY FIX: Only handle view mode changes for the currently active building
    const currentActiveVenueId = appState.getLastActiveVenueId();
    const myVenueId = this.getVenueId(); // We need to track this building's venue ID
    if (!currentActiveVenueId || currentActiveVenueId !== myVenueId) {
      console.log(
        `[BuildingIndoor] Ignoring view mode change - not active building. Active: ${currentActiveVenueId}, This: ${myVenueId}`
      );
      return; // Don't process view mode changes for inactive buildings
    }

    console.log(
      `[BuildingIndoor] Processing view mode change for active building ${myVenueId}: ${mode}, kick: ${kickMode}`
    );

    if (
      !this.buildingData ||
      !Array.isArray(this.buildingData.levels?.features)
    ) {
      return;
    }

    // Update kick toggle UI when kickMode changes
    if (this.kickToggleContainer) {
      const kickInput = this.kickToggleContainer.querySelector(
        'input[type="checkbox"]'
      );
      if (kickInput && kickInput.checked !== kickMode) {
        kickInput.checked = kickMode;
      }
    }
    const current = appState.getSelectedLevel();

    if (mode === "2D") {
      const levels = this.buildingData.levels.features.slice();
      const highest = levels.sort(
        (a, b) => b.properties.zValue - a.properties.zValue
      )[0];
      const effectiveLevel =
        !current || current === "ALL" ? highest?.id : current;

      if (effectiveLevel && effectiveLevel !== current) {
        appState.setSelectedLevel(effectiveLevel);
        await this.handleLevelSelect(effectiveLevel);
        const unitsDataSource = this.dataSources.units;
        if (unitsDataSource && unitsDataSource.entities.values.length > 0) {
          try {
            await this.viewer.flyTo(unitsDataSource.entities.values, {
              duration: 2.0,
              offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
            });
          } catch (error) {
            console.error("Error during flyTo operation:", error);
          }
        }
      }

      // ✅ FIX: Always apply filtering when switching to 2D mode
      await this.filterFeaturesByLevel(effectiveLevel || "ALL", kickMode);

      appState.setUnitLabelState({
        active: true,
        venueId: currentActiveVenueId,
        levelId: effectiveLevel ?? null,
      });
    } else {
      // ✅ FIX: Always apply filtering when switching to 2D mode
      await this.filterFeaturesByLevel(current, kickMode);
      appState.resetUnitLabelState();
    }
    const unitsDataSource = this.dataSources.units;
    if (unitsDataSource && unitsDataSource.entities.values.length > 0) {
      try {
        await this.viewer.flyTo(unitsDataSource.entities.values, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
        });
      } catch (error) {
        console.error("Error during flyTo operation:", error);
      }
    }
  }

  handleUnitLabelStateChange(labelState) {
    const activeBuilding = appState.getActiveBuilding(labelState.venueId);
    if (activeBuilding !== this) {
      this.removeUnitLabels();
      return;
    }

    if (!labelState.active || !labelState.levelId) {
      this.removeUnitLabels();
      return;
    }

    const ds = this.ensureUnitLabelDataSource();
    ds.entities.removeAll();

    const units = this.buildingData.units?.features ?? [];
    units
      .filter(
        (unit) =>
          unit.properties.level_id === labelState.levelId &&
          unit.properties.nameEn
      )
      .forEach((unit) => {
        const center = this.calculatePolygonCenter(
          unit.geometry.coordinates[0]
        );
        if (!center) return;

        ds.entities.add({
          id: `unit_label_${unit.id}`,
          position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat),
          billboard: {
            image: this.createTextCanvas(unit.properties.nameEn),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            scale: 1.0,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          },
        });
      });

    if (ds.entities.values.length === 0) {
      this.removeUnitLabels();
    }
  }
  //////unit-labels/////

  // Calculate polygon center point
  calculatePolygonCenter(coordinates) {
    if (!coordinates || coordinates.length < 3) return null;

    let centerLon = 0,
      centerLat = 0;
    coordinates.forEach((coord) => {
      centerLon += coord[0];
      centerLat += coord[1];
    });

    return {
      lon: centerLon / coordinates.length,
      lat: centerLat / coordinates.length,
    };
  }

  // Create text canvas with transparent background
  createTextCanvas(text) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Set canvas size and font
    canvas.width = 200;
    canvas.height = 40;
    context.font = "bold 14px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // No background - transparent canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw text outline for better visibility against any background
    context.strokeStyle = "rgba(0, 0, 0, 0.8)";
    context.lineWidth = 3;
    context.strokeText(text, centerX, centerY);

    // Draw main text in white
    context.fillStyle = "#FFFFFF";
    context.fillText(text, centerX, centerY);

    return canvas;
  }

  // Initialize the level selection bar UI
  async initLevelBar() {
    // Load the HTML fragment for the level selection bar
    const container = document.getElementById("levelBarContainer");
    if (!container) return;
    const resp = await fetch("./html/level-selection-bar.html");
    const html = await resp.text();
    container.innerHTML = html;
    this.levelBarEl = container.querySelector("#levelSelectionBar");
    this.kickToggleContainer = container.querySelector("#kickToggleContainer");

    // Remove local kickMode - now managed by AppState (SSOT)
    // this.kickMode = false; (SSOT violation removed)

    // Reset selected level using centralized state management
    appState.setSelectedLevel("ALL");
    this.renderKickToggle();
    await this.renderLevelButtons();
  }

  // Render the KICK toggle button
  renderKickToggle() {
    if (!this.kickToggleContainer) return;
    this.kickToggleContainer.innerHTML = "";
    const label = document.createElement("label");
    label.className = "form-check-label mb-1";
    label.style.cursor = "pointer";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "form-check-input me-2";
    input.checked = appState.getKickMode();
    input.addEventListener("change", async () => {
      // Update centralized state instead of local property
      appState.setKickMode(input.checked);
      // Do not re-render level buttons, just re-apply filtering for current selection
      await this.filterFeaturesByLevel(
        appState.getSelectedLevel(),
        appState.getKickMode()
      );

      // Notify other components about kick mode change
      document.dispatchEvent(
        new CustomEvent("levelSelectionChanged", {
          detail: {
            levelId: appState.getSelectedLevel(),
            kickMode: appState.getKickMode(),
            buildingInstance: this,
          },
        })
      );
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode("Below"));
    this.kickToggleContainer.appendChild(label);
  }

  // Render level buttons based on buildingData.levels
  async renderLevelButtons() {
    if (!this.levelBarEl) return;
    const levelsRaw =
      this.buildingData.levels &&
      Array.isArray(this.buildingData.levels.features)
        ? this.buildingData.levels.features
        : [];
    const levels = levelsRaw
      .slice()
      .sort((a, b) => b.properties.zValue - a.properties.zValue);
    this.levelBarEl.innerHTML = "";
    // ALL button
    const allBtn = document.createElement("button");
    allBtn.className = "level-btn btn btn-secondary mb-2";
    allBtn.textContent = "ALL";
    allBtn.dataset.levelId = "ALL";
    allBtn.addEventListener(
      "click",
      async () => await this.handleLevelSelect("ALL")
    );
    this.levelBarEl.appendChild(allBtn);
    // Level buttons
    levels.forEach((level) => {
      const btn = document.createElement("button");
      btn.className = "level-btn btn btn-outline-primary mb-2";
      btn.textContent = level.properties.short_name?.en;
      btn.dataset.levelId = level.id;
      btn.addEventListener(
        "click",
        async () => await this.handleLevelSelect(level.id)
      );
      this.levelBarEl.appendChild(btn);
    });
    // By default, select ALL when bar is first created or building is loaded
    const currentSelectedLevel = appState.getSelectedLevel();
    if (!currentSelectedLevel || currentSelectedLevel === "ALL") {
      await this.handleLevelSelect("ALL");
    } else {
      await this.handleLevelSelect(currentSelectedLevel);
    }
  }

  // Handle level selection event
  async handleLevelSelect(levelId) {
    // Update centralized state instead of local property
    const current = appState.getSelectedLevel();
    appState.setSelectedLevel(levelId);
    // Highlight selected button
    if (this.levelBarEl) {
      Array.from(this.levelBarEl.children).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.levelId === String(levelId));
      });
    }
    // Filter displayed features by selected level and kickMode
    await this.filterFeaturesByLevel(levelId, appState.getKickMode());

    //// When the user selects a level while in 2D
    if (appState.isIn2DMode()) {
      appState.setUnitLabelState({
        active: true,
        venueId: appState.getLastActiveVenueId(),
        levelId,
      });
    }

    // Notify other components about level selection change
    document.dispatchEvent(
      new CustomEvent("levelSelectionChanged", {
        detail: {
          levelId: levelId,
          kickMode: appState.getKickMode(),
          buildingInstance: this,
        },
      })
    );
  }

  // Filter features/entities by level and kickMode
  async filterFeaturesByLevel(levelId, kickMode) {
    // If ALL, show everything
    const is2DMode = appState.isIn2DMode();
    if (levelId === "ALL") {
      Object.values(this.dataSources).forEach((ds) => {
        ds.entities.values.forEach((entity) => {
          const featureType = this.getEntityFeatureType(entity);
          if (is2DMode) {
            entity.show = !["wall", "door"].includes(featureType);
          } else {
            entity.show = true;
          }
        });
      });
      return;
    }

    // Get all levels, sorted by zValue descending (for UI), but for filtering, use zValue
    const levelsRaw =
      this.buildingData.levels &&
      Array.isArray(this.buildingData.levels.features)
        ? this.buildingData.levels.features
        : [];
    const levels = levelsRaw
      .slice()
      .sort((a, b) => b.properties.zValue - a.properties.zValue);

    // Find selected level's zValue
    const selectedLevel = levels.find((lvl) => lvl.id === levelId);
    let allowedLevelIds = [];
    if (kickMode && selectedLevel) {
      // Show all levels with zValue <= selected (i.e., below or at selected)
      allowedLevelIds = levels
        .filter(
          (lvl) => lvl.properties.zValue <= selectedLevel.properties.zValue
        )
        .map((lvl) => lvl.id);
    } else if (!kickMode && selectedLevel) {
      // Only show selected level
      allowedLevelIds = [levelId];
    } else {
      // Fallback: only selected
      allowedLevelIds = [levelId];
    }

    // For each entity, show if its level_id is in allowedLevelIds
    Object.values(this.dataSources).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        // Try to get level_id from entity properties
        let entityLevelId = null;
        if (entity.properties && entity.properties.level_id) {
          entityLevelId = entity.properties.level_id.getValue
            ? entity.properties.level_id.getValue()
            : entity.properties.level_id;
        }

        // Special handling for walls - they should follow the same level filtering

        const featureType = this.getEntityFeatureType(entity);
        if (is2DMode) {
          // Hide walls and doors in 2D mode regardless of level
          if (["wall", "door"].includes(featureType)) {
            entity.show = false;
            return;
          }
          // For other features, apply level filtering
          const levelVisible = allowedLevelIds.includes(entityLevelId);
          entity.show = levelVisible;
        } else {
          if (["wall", "door"].includes(featureType)) {
            console.log(entity);
          }
          entity.show = allowedLevelIds.includes(entityLevelId);
        }

        // Show if allowed, hide otherwise
      });
    });

    // Handle highlight entities separately - they should always follow their parent
    if (this.highlightEntity) {
      const parentEntityId =
        this.highlightEntity.properties &&
        this.highlightEntity.properties.parent_entity
          ? this.highlightEntity.properties.parent_entity.getValue
            ? this.highlightEntity.properties.parent_entity.getValue()
            : this.highlightEntity.properties.parent_entity
          : null;

      if (
        parentEntityId &&
        this.selectedEntity &&
        this.selectedEntity.id === parentEntityId
      ) {
        // Show highlight if parent entity is shown
        this.highlightEntity.show = this.selectedEntity.show;
      }
    }
  }

  // Helper method to safely get feature type from entity
  getEntityFeatureType(entity) {
    if (!entity.properties) return null;

    const featureType = entity.properties.feature_type;
    return featureType?.getValue ? featureType.getValue() : featureType;
  }

  // Reset the level bar and show all entities (ALL mode) for this building
  async resetLevelBarAndShowAll() {
    // Update centralized state instead of local property
    appState.setSelectedLevel("ALL");
    appState.setKickMode(false); // Reset kick mode to centralized state
    if (this.levelBarEl) {
      Array.from(this.levelBarEl.children).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.levelId === "ALL");
      });
    }
    await this.filterFeaturesByLevel("ALL", false);
  }

  // Clear any existing selection and highlighting
  clearSelection() {
    if (
      this.highlightEntity &&
      this.viewer.entities.contains(this.highlightEntity)
    ) {
      this.viewer.entities.remove(this.highlightEntity);
    }

    // Restore original appearance for previously selected features
    if (this.selectedEntity) {
      if (this.selectedEntity.polygon) {
        // Reset polygon material to original style
        const featureType =
          this.selectedEntity.properties &&
          this.selectedEntity.properties.feature_type
            ? this.selectedEntity.properties.feature_type.getValue
              ? this.selectedEntity.properties.feature_type.getValue()
              : this.selectedEntity.properties.feature_type
            : null;

        if (featureType === "unit") {
          const category =
            this.selectedEntity.properties &&
            this.selectedEntity.properties.category
              ? this.selectedEntity.properties.category.getValue
                ? this.selectedEntity.properties.category.getValue()
                : this.selectedEntity.properties.category
              : "default";

          const originalStyle =
            this.styles.unit[category] || this.styles.unit.default;
          if (originalStyle && originalStyle.fill) {
            this.selectedEntity.polygon.material = originalStyle.fill;
          }
        } else if (featureType === "opening") {
          this.selectedEntity.polygon.material = this.styles.opening.fill;
        } else if (featureType === "window") {
          this.selectedEntity.polygon.material = this.styles.window.fill;
        } else if (featureType === "door") {
          // Restore original door material
          const category =
            this.selectedEntity.properties &&
            this.selectedEntity.properties.category
              ? this.selectedEntity.properties.category.getValue
                ? this.selectedEntity.properties.category.getValue()
                : this.selectedEntity.properties.category
              : "default";

          const originalStyle =
            this.styles.door[category] || this.styles.door.default;
          if (originalStyle && originalStyle.material) {
            this.selectedEntity.polygon.material = originalStyle.material;
          }
        }
      } else if (
        this.selectedEntity.billboard &&
        this.selectedEntity._originalScale !== undefined
      ) {
        // Restore original icon scale
        this.selectedEntity.billboard.scale =
          this.selectedEntity._originalScale;
        delete this.selectedEntity._originalScale;
      }
    }

    this.selectedEntity = null;
    this.highlightEntity = null;
  }

  // Highlight a selected feature
  highlightFeature(entity) {
    // Clear any existing selection first
    this.clearSelection();

    const featureType =
      entity.properties && entity.properties.feature_type
        ? entity.properties.feature_type.getValue
          ? entity.properties.feature_type.getValue()
          : entity.properties.feature_type
        : null;

    if (!featureType || featureType === "wall") return; // Don't highlight walls

    this.selectedEntity = entity;

    if (entity.polygon) {
      // Polygon feature highlighting (units)
      entity.polygon.material = this.styles.highlight.polygon.material;
    } else if (entity.billboard) {
      // Point feature highlighting (amenities, occupants) - scale icon only
      // Store original scale for restoration
      entity._originalScale = entity.billboard.scale
        ? entity.billboard.scale.getValue()
        : 1.0;

      // Scale up the icon
      entity.billboard.scale = entity._originalScale * 1.4;
    } else if (entity.polyline) {
      ///, openings, windows
      entity.polyline.material = this.styles.highlight.linestring.material;
      entity.polyline.width = this.styles.highlight.linestring.width;
    }
  }

  // Find entity by ID in building data sources
  findEntityById(entityId) {
    for (const dataSource of Object.values(this.dataSources || {})) {
      const entity = dataSource.entities.getById(entityId);
      if (entity) return entity;
    }
    return null;
  }

  // Clean up and remove all building entities including walls
  destroy() {
    // Clear any highlights first
    this.clearSelection();

    // Remove all Cesium entities related to this building (including walls)
    if (this.dataSources) {
      Object.values(this.dataSources).forEach((ds) => {
        this.viewer.dataSources.remove(ds, true);
      });
      this.dataSources = {};
    }
    // unit-labels
    this.stateCleanups.forEach((cleanup) => cleanup());
    this.stateCleanups = [];
    this.removeUnitLabels();

    console.log("Building and associated walls destroyed");
    // Optionally, clear the level bar if this building owns it
    // (Handled by new building's initLevelBar)
  }

  // Apply Z-value clipping to all building entities (all feature types including walls)
  applyZClipping(maxZ) {
    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        let entityZ = null;
        // All features must have zValue in properties
        if (entity.properties && entity.properties.zValue !== undefined) {
          entityZ = entity.properties.zValue.getValue
            ? entity.properties.zValue.getValue()
            : entity.properties.zValue;
          entityZ = parseFloat(entityZ);
        }

        // Special handling for walls - consider both base height and wall height
        const featureType =
          entity.properties && entity.properties.feature_type
            ? entity.properties.feature_type.getValue
              ? entity.properties.feature_type.getValue()
              : entity.properties.feature_type
            : null;

        if (featureType === "wall") {
          // For walls, check if the base of the wall is below the clipping plane
          // This ensures walls are visible when their level is visible
          entity.show =
            entityZ === null || isNaN(entityZ) ? true : entityZ <= maxZ;
        } else if (featureType === "door") {
          // For doors, apply same logic as walls - they should be visible when their level is visible
          entity.show =
            entityZ === null || isNaN(entityZ) ? true : entityZ <= maxZ;
        } else {
          // Show if entityZ is not above maxZ, or if undetermined
          entity.show =
            entityZ === null || isNaN(entityZ) ? true : entityZ <= maxZ;
        }
      });
    });

    // Handle highlight entities separately - they should always follow their parent for Z-clipping
    if (this.highlightEntity) {
      const parentEntityId =
        this.highlightEntity.properties &&
        this.highlightEntity.properties.parent_entity
          ? this.highlightEntity.properties.parent_entity.getValue
            ? this.highlightEntity.properties.parent_entity.getValue()
            : this.highlightEntity.properties.parent_entity
          : null;

      if (
        parentEntityId &&
        this.selectedEntity &&
        this.selectedEntity.id === parentEntityId
      ) {
        // Highlight should always be visible if parent is visible (even when Z-clipped)
        // This ensures selected features remain highlighted
        this.highlightEntity.show = this.selectedEntity.show;
      }
    }
  }

  // Reset Z-clipping to show all entities
  resetZClipping() {
    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        entity.show = true;
      });
    });
  }

  // Generate 3D walls for all units in the building
  generateUnitWalls() {
    if (!this.buildingData.levels || !this.buildingData.units) {
      console.warn("Cannot generate walls: missing levels or units data");
      return [];
    }

    // Create level height mapping
    const levelMap = new Map();
    const newLevelMap = new Map();
    this.buildingData.levels.features.forEach((level) => {
      levelMap.set(level.id, level.properties.zValue);
    });
    this.buildingData.levels.features.forEach((level) => {
      newLevelMap.set(level.id, {
        zValue: level.properties.zValue,
        ordinal: level.properties.ordinal,
      });
    });
    const sorted = [...newLevelMap.values()].sort(
      (a, b) => a.zValue - b.zValue
    );
    console.log(sorted);
    // Get sorted levels for height calculations
    const sortedLevels = [...levelMap.values()].sort((a, b) => a - b);

    console.log(
      `Generating walls for ${this.buildingData.units.features.length} units across ${sortedLevels.length} levels`
    );

    const wallEntities = [];

    this.buildingData.units.features.forEach((unit, index) => {
      try {
        const currentZ = levelMap.get(unit.properties.level_id);
        if (currentZ === undefined) {
          console.warn(
            `Unit ${unit.id} has invalid level_id: ${unit.properties.level_id}`
          );
          return;
        }

        // Calculate wall height based on level position
        const currentIndex = sortedLevels.indexOf(currentZ);
        let wallHeight = 2.0; // Default height for top level or fallback

        if (currentIndex < sortedLevels.length - 1) {
          // Not the top level - use distance to next level
          wallHeight = sortedLevels[currentIndex + 1] - currentZ;
        }

        ///default 2.5m
        wallHeight = 2.8;
        // Create wall entity from unit polygon
        const wallEntity = this.createWallFromPolygon(
          unit.geometry.coordinates[0],
          currentZ,
          wallHeight,
          unit.id,
          unit.properties.category || "default",
          unit.properties
        );

        if (wallEntity) {
          wallEntities.push(wallEntity);
        }
      } catch (error) {
        console.error(`Error generating wall for unit ${unit.id}:`, error);
      }
    });

    console.log(`Successfully generated ${wallEntities.length} wall entities`);
    return wallEntities;
  }

  // Create a 3D wall entity from a polygon's coordinates
  createWallFromPolygon(
    coordinates,
    baseHeight,
    wallHeight,
    unitId,
    category = "default",
    properties = {}
  ) {
    if (!coordinates || coordinates.length < 3) {
      console.warn(`Invalid coordinates for unit ${unitId}`);
      return null;
    }

    try {
      // Convert coordinates to Cesium format and ensure closure
      const positions = [];
      coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          positions.push(coord[0], coord[1]); // lon, lat
        }
      });

      // Ensure polygon is closed
      if (positions.length >= 6) {
        const firstLon = positions[0];
        const firstLat = positions[1];
        const lastLon = positions[positions.length - 2];
        const lastLat = positions[positions.length - 1];

        if (firstLon !== lastLon || firstLat !== lastLat) {
          positions.push(firstLon, firstLat);
        }
      }

      // Create Cesium positions from coordinates
      const cesiumPositions = Cesium.Cartesian3.fromDegreesArray(positions);

      // Get wall style based on category
      const wallStyle = this.styles.wall[category] || this.styles.wall.default;

      // Create wall entity
      const wallEntity = new Cesium.Entity({
        id: `wall_${unitId}`,
        name: `Wall for ${properties.nameEn || unitId}`,
        polygon: {
          hierarchy: cesiumPositions,
          material: wallStyle.material,
          outline: wallStyle.outline,
          outlineColor: wallStyle.outlineColor,
          height: baseHeight,
          extrudedHeight: baseHeight + wallHeight,
          closeTop: false,
          closeBottom: true,
        },
        // Make wall completely unpickable
        feature_type: "wall",
        allowPicking: false,
        properties: {
          feature_type: "wall",
          unit_id: unitId,
          level_id: properties.level_id,
          zValue: baseHeight,
          wallHeight: wallHeight,
          category: category,
          venue_id: properties.venue_id,
        },
      });

      return wallEntity;
    } catch (error) {
      console.error(`Error creating wall entity for unit ${unitId}:`, error);
      return null;
    }
  }

  // Generate 3D doors for all openings in the building
  generateOpeningDoors() {
    if (!this.buildingData.levels || !this.buildingData.openings) {
      console.warn("Cannot generate doors: missing levels or openings data");
      return [];
    }

    // Create level height mapping
    const levelMap = new Map();
    this.buildingData.levels.features.forEach((level) => {
      levelMap.set(level.id, level.properties.zValue);
    });

    console.log(
      `Generating doors for ${this.buildingData.openings.features.length} openings across ${this.buildingData.levels.features.length} levels`
    );

    const doorEntities = [];

    this.buildingData.openings.features.forEach((opening, index) => {
      try {
        const currentZ = levelMap.get(opening.properties.level_id);
        if (currentZ === undefined) {
          console.warn(
            `Opening ${opening.id} has invalid level_id: ${opening.properties.level_id}`
          );
          return;
        }

        // Fixed door height of 2 meters as requested
        const doorHeight = 2.0;

        // Create door entity from opening polyline
        const doorEntity = this.createDoorFromPolyline(
          opening.geometry.coordinates,
          currentZ,
          doorHeight,
          opening.id,
          opening.properties.category || "default",
          opening.properties
        );

        if (doorEntity) {
          doorEntities.push(doorEntity);
        }
      } catch (error) {
        console.error(
          `Error generating door for opening ${opening.id}:`,
          error
        );
      }
    });

    console.log(`Successfully generated ${doorEntities.length} door entities`);
    return doorEntities;
  }

  // Create a 3D door entity from a polyline's coordinates
  createDoorFromPolyline(
    coordinates,
    baseHeight,
    doorHeight,
    openingId,
    category = "default",
    properties = {}
  ) {
    if (!coordinates || coordinates.length < 2) {
      console.warn(`Invalid coordinates for opening ${openingId}`);
      return null;
    }

    try {
      // Convert polyline coordinates to Cesium format
      const positions = [];
      coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          positions.push(coord[0], coord[1]); // lon, lat
        }
      });

      if (positions.length < 4) {
        // Need at least 2 points (4 values)
        console.warn(`Insufficient coordinates for door ${openingId}`);
        return null;
      }

      // Create door as a thin rectangular polygon from the polyline
      // Use the polyline to create a thin rectangle representing the door
      const doorWidth = 0.1; // 10cm thick door
      const startPoint = [positions[0], positions[1]];
      const endPoint = [
        positions[positions.length - 2],
        positions[positions.length - 1],
      ];

      // Calculate perpendicular direction for door thickness
      const dx = endPoint[0] - startPoint[0];
      const dy = endPoint[1] - startPoint[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      /// approximate both latitude and longitude degrees as 111000 meters per degree.
      const perpX = ((-dy / length) * doorWidth) / 111000; // Approximate degrees conversion
      const perpY = ((dx / length) * doorWidth) / 111000;

      // Create door rectangle coordinates
      const doorCoords = [
        [startPoint[0] + perpX, startPoint[1] + perpY],
        [endPoint[0] + perpX, endPoint[1] + perpY],
        [endPoint[0] - perpX, endPoint[1] - perpY],
        [startPoint[0] - perpX, startPoint[1] - perpY],
        [startPoint[0] + perpX, startPoint[1] + perpY], // Close the polygon
      ];

      // Convert to flat array for Cesium
      const doorPositions = [];
      doorCoords.forEach((coord) => {
        doorPositions.push(coord[0], coord[1]);
      });

      // Create Cesium positions from coordinates
      const cesiumPositions = Cesium.Cartesian3.fromDegreesArray(doorPositions);

      // Get door style based on category
      const doorStyle = this.styles.door[category] || this.styles.door.default;

      const newProperties = properties;
      delete newProperties.feature_type;
      // Create door entity
      const doorEntity = new Cesium.Entity({
        id: `door_${openingId}`,
        name: `Door for ${properties.nameEn || openingId}`,
        polygon: {
          hierarchy: cesiumPositions,
          material: doorStyle.material,
          outline: doorStyle.outline,
          outlineColor: doorStyle.outlineColor,
          height: baseHeight,
          extrudedHeight: baseHeight + doorHeight,
          closeTop: false,
          closeBottom: true,
        },

        // Make door clickable (unlike walls)
        properties: {
          feature_type: "door",
          opening_id: openingId,
          level_id: properties.level_id,
          zValue: baseHeight,
          doorHeight: doorHeight,
          category: category,
          venue_id: properties.venue_id,
          // Inherit all original opening properties
          ...newProperties,
        },
      });

      return doorEntity;
    } catch (error) {
      console.error(
        `Error creating door entity for opening ${openingId}:`,
        error
      );
      return null;
    }
  }
}
