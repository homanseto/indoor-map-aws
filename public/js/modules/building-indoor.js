import { indoorStyles } from "../utils/indoorStyles.js";
import { customizeEntityDisplayInfo } from "../utils/informationBox.js";
// BuildingIndoor class for managing 3D building visualization
// This is a scaffold. You will need to implement methods based on your buildingData structure.

export class BuildingIndoor {
  constructor(viewer, buildingData) {
    this.viewer = viewer;
    this.buildingData = buildingData;
    this.styles = indoorStyles;

    // Selection management
    this.selectedEntity = null;
    this.highlightEntity = null;

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

    for (const { dataKey, styleKey } of featureTypes) {
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
        styleKey === "occupant" ||
        styleKey === "wall"
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

        // Special handling for walls - they should follow the same level filtering
        const featureType =
          entity.properties && entity.properties.feature_type
            ? entity.properties.feature_type.getValue
              ? entity.properties.feature_type.getValue()
              : entity.properties.feature_type
            : null;

        // Show if allowed, hide otherwise
        entity.show = allowedLevelIds.includes(entityLevelId);
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

  // Clear any existing selection and highlighting
  clearSelection() {
    if (
      this.highlightEntity &&
      this.viewer.entities.contains(this.highlightEntity)
    ) {
      this.viewer.entities.remove(this.highlightEntity);
    }

    // Restore original appearance for previously selected polygon
    if (this.selectedEntity && this.selectedEntity.polygon) {
      // Reset to original material - need to get original style
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
      // Polygon feature highlighting (units, openings, windows)
      entity.polygon.material = this.styles.highlight.polygon.material;
    } else if (entity.billboard) {
      // Point feature highlighting (amenities, occupants) - add glow
      const position = entity.position.getValue(Cesium.JulianDate.now());

      this.highlightEntity = this.viewer.entities.add({
        id: `highlight_${entity.id}`,
        position: position,
        ellipse: this.styles.highlight.point.ellipse,
        properties: {
          feature_type: "highlight",
          parent_entity: entity.id,
        },
      });
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
}
