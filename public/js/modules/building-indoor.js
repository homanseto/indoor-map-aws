import { indoorStyles } from "../utils/indoorStyles.js";
// BuildingIndoor class for managing 3D building visualization
// This is a scaffold. You will need to implement methods based on your buildingData structure.

export class BuildingIndoor {
  constructor(viewer, buildingData) {
    this.viewer = viewer;
    this.buildingData = buildingData;
    this.styles = indoorStyles;
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

    for (const { dataKey, styleKey } of featureTypes) {
      const featureCollection = this.buildingData[dataKey];
      if (
        !featureCollection ||
        !featureCollection.features ||
        featureCollection.features.length === 0
      )
        continue;

      // For category-based styling (units, amenities), use category; for others, use styleKey directly
      if (styleKey === "unit" || styleKey === "amenity") {
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
    this.kickMode = false; // false: only selected, true: show with lower
    this.selectedLevelId = null; // Reset selected level on new building
    this.renderKickToggle();
    this.renderLevelButtons();
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
    input.checked = this.kickMode;
    input.addEventListener("change", () => {
      this.kickMode = input.checked;
      // Do not re-render level buttons, just re-apply filtering for current selection
      this.filterFeaturesByLevel(this.selectedLevelId, this.kickMode);
    });
    label.appendChild(input);
    label.appendChild(document.createTextNode("Below"));
    this.kickToggleContainer.appendChild(label);
  }

  // Render level buttons based on buildingData.levels
  renderLevelButtons() {
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
    allBtn.addEventListener("click", () => this.handleLevelSelect("ALL"));
    this.levelBarEl.appendChild(allBtn);
    // Level buttons
    levels.forEach((level) => {
      const btn = document.createElement("button");
      btn.className = "level-btn btn btn-outline-primary mb-2";
      btn.textContent = level.properties.short_name?.en;
      btn.dataset.levelId = level.id;
      btn.addEventListener("click", () => this.handleLevelSelect(level.id));
      this.levelBarEl.appendChild(btn);
    });
    // By default, select ALL when bar is first created or building is loaded
    if (!this.selectedLevelId || this.selectedLevelId === "ALL") {
      this.handleLevelSelect("ALL");
    } else {
      this.handleLevelSelect(this.selectedLevelId);
    }
  }

  // Handle level selection event
  handleLevelSelect(levelId) {
    this.selectedLevelId = levelId;
    // Highlight selected button
    if (this.levelBarEl) {
      Array.from(this.levelBarEl.children).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.levelId === String(levelId));
      });
    }
    // Filter displayed features by selected level and kickMode
    this.filterFeaturesByLevel(levelId, this.kickMode);
  }

  // Filter features/entities by level and kickMode
  filterFeaturesByLevel(levelId, kickMode) {
    // If ALL, show everything
    if (levelId === "ALL") {
      Object.values(this.dataSources).forEach((ds) => {
        ds.entities.values.forEach((entity) => {
          entity.show = true;
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
        // Show if allowed, hide otherwise
        entity.show = allowedLevelIds.includes(entityLevelId);
      });
    });
  }

  // Reset the level bar and show all entities (ALL mode) for this building
  resetLevelBarAndShowAll() {
    this.selectedLevelId = "ALL";
    this.kickMode = false;
    if (this.levelBarEl) {
      Array.from(this.levelBarEl.children).forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.levelId === "ALL");
      });
    }
    this.filterFeaturesByLevel("ALL", false);
  }

  // Example method
  destroy() {
    // Remove all Cesium entities related to this building
    if (this.dataSources) {
      Object.values(this.dataSources).forEach((ds) => {
        this.viewer.dataSources.remove(ds, true);
      });
      this.dataSources = {};
    }
    // Optionally, clear the level bar if this building owns it
    // (Handled by new building's initLevelBar)
  }

  // Apply Z-value clipping to all building entities (all feature types)
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
        // Show if entityZ is not above maxZ, or if undetermined
        entity.show =
          entityZ === null || isNaN(entityZ) ? true : entityZ <= maxZ;
      });
    });
  }

  // Reset Z-clipping to show all entities
  resetZClipping() {
    Object.values(this.dataSources || {}).forEach((ds) => {
      ds.entities.values.forEach((entity) => {
        entity.show = true;
      });
    });
  }
}
