import { TwoDLayeringManager } from "../controllers/TwoDLayeringManager.js";
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

    const unitLabelCleanup = StateHooks.useUnitLabelState(
      (labelState) => {
        this.handleUnitLabelStateChange(labelState);
      },
      { debugMode: false, name: `UnitLabelHook_${venueId}` }
    );

    const wallVisibilityCleanup = appState.subscribe(
      "wallsVisibilityChanged",
      (data) => {
        console.log(
          `[BuildingIndoor] Wall visibility changed: ${data.visible}`
        );
        this.handleWallVisibilityChange(data.visible);
      }
    );

    this.stateCleanups.push(viewModeCleanup1);
    this.stateCleanups.push(viewModeCleanup2);
    this.stateCleanups.push(unitLabelCleanup);
    this.stateCleanups.push(wallVisibilityCleanup);

    // ✅ ADD HERE: Setup camera monitoring for unit labels
    this.setupCameraMonitoringForLabels();
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

    // ✅ NEW: Generate and add 3D window-walls for windows
    console.log("Generating 3D window-walls for building windows...");
    const windowWallEntities = this.generateWindowWalls();
    if (windowWallEntities.length > 0) {
      const windowWallDataSource = new Cesium.CustomDataSource("window_walls");
      // Get the original window features for customization
      const windowFeatures = this.buildingData.windows.features;

      windowWallEntities.forEach((windowWallEntity) => {
        // Find the corresponding window feature for this window-wall
        const originalWindow = windowFeatures.find(
          (window) => windowWallEntity.id === `window-wall_${window.id}`
        );
        if (originalWindow) {
          customizeEntityDisplayInfo(windowWallEntity, originalWindow);
        }
        windowWallDataSource.entities.add(windowWallEntity);
      });
      this.viewer.dataSources.add(windowWallDataSource);
      this.dataSources["window-walls"] = windowWallDataSource;
      console.log(
        `Added ${windowWallEntities.length} window-wall entities to viewer`
      );
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
        styleKey === "amenity" ||
        styleKey === "occupant" ||
        styleKey === "unit"
      ) {
        const styledFeatures = featureCollection.features.map((feature) => {
          let category = feature.properties && feature.properties.category;
          if (category === "opentobelow") {
            console.log(category);
          }
          let restriction =
            feature.properties && feature.properties.restriction;
          if (
            category === "unspecified" &&
            restriction === "restricted" &&
            styleKey === "unit"
          ) {
            category = "restricted";
          }
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

  /**
   * Initialize 2D Layering Manager
   */
  init2DLayeringManager() {
    if (!this.twoDLayeringManager) {
      this.twoDLayeringManager = new TwoDLayeringManager(this.viewer, this);
      console.log("[BuildingIndoor] 2D Layering Manager initialized");
    }
  }

  async handleViewModeStateChange(uiState) {
    const mode = uiState.viewMode;
    let kickMode = uiState.kickMode;

    // 🔥 KEY FIX: Only handle view mode changes for the currently active building
    const currentActiveVenueId = appState.getLastActiveVenueId();
    const myVenueId = this.getVenueId();
    if (!currentActiveVenueId || currentActiveVenueId !== myVenueId) {
      console.log(
        `[BuildingIndoor] Ignoring view mode change for inactive building ${myVenueId}`
      );
      return;
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

    // Initialize 2D manager if not already done
    this.init2DLayeringManager();

    if (mode === "2D") {
      appState.setKickMode(false);
      kickMode = false;
    }

    // Update kick toggle UI when kickMode changes
    if (this.kickToggleContainer && !appState.isIn2DMode) {
      const checkbox = this.kickToggleContainer.querySelector(
        "input[type='checkbox']"
      );
      if (checkbox) {
        checkbox.checked = kickMode;
      }
    }

    const current = appState.getSelectedLevel();

    if (mode === "2D") {
      // Apply 2D layering and filtering
      await this.twoDLayeringManager.apply2DMode();
      const levels = this.buildingData.levels.features.slice();
      const highest = levels.sort(
        (a, b) => b.properties.zValue - a.properties.zValue
      )[0];
      const effectiveLevel =
        !current || current === "ALL" ? highest?.id : current;

      // Apply filtering first
      await this.filterFeaturesByLevel(effectiveLevel || "ALL", kickMode);

      // ✅ TRIGGER unit labels for 2D mode - automatically show when switching to 2D
      appState.setUnitLabelState({
        active: true,
        venueId: currentActiveVenueId,
        levelId: effectiveLevel,
      });

      // Fly to units with appropriate 2D view
      await this.flyToUnitsFor2D();
    } else {
      // Restore 3D mode
      await this.twoDLayeringManager.restore3DMode();
      await this.filterFeaturesByLevel(current, kickMode);

      // ✅ HIDE unit labels in 3D mode
      appState.resetUnitLabelState();

      // Fly to units with 3D perspective
      await this.flyToUnitsFor3D();
    }
  }

  /**
   * Optimized fly-to for 2D mode
   */
  async flyToUnitsFor2D() {
    const unitsDataSource = this.dataSources.units;
    if (unitsDataSource && unitsDataSource.entities.values.length > 0) {
      try {
        await this.viewer.flyTo(unitsDataSource.entities.values, {
          duration: 1.5,
          offset: new Cesium.HeadingPitchRange(0, -Math.PI / 2, 0), // Top-down view
        });
      } catch (error) {
        console.error("Error during 2D flyTo operation:", error);
      }
    }
  }

  /**
   * Optimized fly-to for 3D mode
   */
  async flyToUnitsFor3D() {
    const unitsDataSource = this.dataSources.units;
    if (unitsDataSource && unitsDataSource.entities.values.length > 0) {
      try {
        await this.viewer.flyTo(unitsDataSource.entities.values, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, -0.5, 100), // 3D perspective
        });
      } catch (error) {
        console.error("Error during 3D flyTo operation:", error);
      }
    }
  }

  // NEW METHOD: Check if label fits within unit polygon
  isLabelWithinUnit(labelCanvas, interiorPoint, polygon, holes = []) {
    // Convert canvas dimensions to approximate geographic bounds
    const labelWidthDegrees = labelCanvas.width * 0.000001; // Rough conversion
    const labelHeightDegrees = labelCanvas.height * 0.000001;

    // Create label bounding box corners
    const labelBounds = [
      [
        interiorPoint.lon - labelWidthDegrees / 2,
        interiorPoint.lat - labelHeightDegrees / 2,
      ],
      [
        interiorPoint.lon + labelWidthDegrees / 2,
        interiorPoint.lat - labelHeightDegrees / 2,
      ],
      [
        interiorPoint.lon + labelWidthDegrees / 2,
        interiorPoint.lat + labelHeightDegrees / 2,
      ],
      [
        interiorPoint.lon - labelWidthDegrees / 2,
        interiorPoint.lat + labelHeightDegrees / 2,
      ],
    ];

    // Check if ALL corners of label are within the unit polygon
    for (const corner of labelBounds) {
      const point = { lon: corner[0], lat: corner[1] };
      if (!this.isPointInPolygon(point, polygon, holes)) {
        return false; // Label extends outside unit
      }
    }

    return true; // Label fits completely within unit
  }

  // Add this method to monitor camera changes for unit label updates
  setupCameraMonitoringForLabels() {
    let lastCameraHeight = -1;
    let updateTimeout = null;

    // Monitor camera changes
    this.cameraChangeRemover = this.viewer.camera.changed.addEventListener(
      () => {
        // Get current camera height
        const currentHeight = this.getCameraHeight();

        // Only update if height changed significantly (avoid excessive updates)
        if (Math.abs(currentHeight - lastCameraHeight) > 1) {
          // Debounce updates to avoid performance issues
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          updateTimeout = setTimeout(() => {
            // Only update labels if currently in 2D mode and labels are active
            if (appState.isIn2DMode() && this.unitLabelDataSource) {
              console.log(
                `[BuildingIndoor] Camera height changed: ${currentHeight.toFixed(
                  2
                )}m - updating unit labels`
              );

              // Get current label state and retrigger the update
              const currentLabelState = appState.getUnitLabelState();
              if (currentLabelState.active) {
                this.handleUnitLabelStateChange(currentLabelState);
              }
            }
            lastCameraHeight = currentHeight;
          }, 150); // 150ms delay to avoid too frequent updates
        }
      }
    );
  }

  // Helper method to get camera height
  getCameraHeight() {
    const camera = this.viewer.camera;
    const cartographic = Cesium.Cartographic.fromCartesian(camera.position);
    return cartographic.height;
  }

  handleUnitLabelStateChange(labelState) {
    console.log("[BuildingIndoor] Unit label state changed:", labelState);

    const currentHeight = this.getCameraHeight();

    const activeBuilding = appState.getActiveBuilding(labelState.venueId);
    if (activeBuilding !== this) {
      this.removeUnitLabels();
      return;
    }

    // Only show labels in 2D mode and when active
    if (!labelState.active || !appState.isIn2DMode()) {
      this.removeUnitLabels();
      return;
    }

    const ds = this.ensureUnitLabelDataSource();
    ds.entities.removeAll();

    const units = this.buildingData.units?.features ?? [];

    // Filter units based on level selection
    let filteredUnits = units.filter((unit) => unit.properties.nameEn);

    if (labelState.levelId && labelState.levelId !== "ALL") {
      filteredUnits = filteredUnits.filter(
        (unit) => unit.properties.level_id === labelState.levelId
      );
    }

    if (currentHeight > 11809450) {
      return;
    }

    filteredUnits.forEach((unit) => {
      // Extract holes if polygon has them (for donut-shaped units)
      const mainPolygon = unit.geometry.coordinates[0];
      const holes = unit.geometry.coordinates.slice(1); // Additional rings are holes

      // Calculate polygon area for size-based visibility decisions
      const polygonArea = this.calculatePolygonArea(mainPolygon);
      const isVerySmallPolygon = polygonArea < 0.000000001; // Very small threshold

      // Calculate optimal interior point (avoids holes automatically)
      const interiorPoint = this.calculatePolygonInteriorPoint(
        mainPolygon,
        holes
      );
      if (!interiorPoint) return;

      // Create adaptive-sized label
      const maxLabelWidth = isVerySmallPolygon ? 80 : 120;
      const maxLabelHeight = isVerySmallPolygon ? 16 : 24;
      const labelCanvas = this.createTextCanvas(
        unit.properties.nameEn,
        maxLabelWidth,
        maxLabelHeight
      );

      // ✅ KEY CHECK: Only show label if it fits completely within unit
      // if (
      //   !this.isLabelWithinUnit(labelCanvas, interiorPoint, mainPolygon, holes)
      // ) {
      //   return; // Skip this unit - label doesn't fit
      // }

      // Create distance display condition based on polygon size
      let minDistance, maxDistance;
      if (isVerySmallPolygon) {
        // Small polygons: only show when zoomed in close
        minDistance = 0;
        maxDistance = 50; // Only visible when very close
      } else {
        // Normal polygons: show at moderate zoom levels
        minDistance = 0;
        maxDistance = 120;
      }

      ds.entities.add({
        id: `unit_label_${unit.id}`,
        position: Cesium.Cartesian3.fromDegrees(
          interiorPoint.lon,
          interiorPoint.lat,
          0.25 // Height will be adjusted by TwoDLayeringManager
        ),
        billboard: {
          image: labelCanvas,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          scale: isVerySmallPolygon ? 0.7 : 0.8, // Smaller scale for tiny units
          heightReference: Cesium.HeightReference.NONE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          // Size-based scaling
          scaleByDistance: new Cesium.NearFarScalar(
            20,
            isVerySmallPolygon ? 1.2 : 1.0,
            maxDistance,
            0.4
          ),
          // Size-based visibility
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            minDistance,
            maxDistance
          ),
        },
        allowPicking: false,
        // Store metadata for debugging
        _unitArea: polygonArea,
        _isSmallUnit: isVerySmallPolygon,
      });
    });

    if (ds.entities.values.length === 0) {
      this.removeUnitLabels();
    } else {
      const smallUnits = ds.entities.values.filter(
        (e) => e._isSmallUnit
      ).length;
      console.log(
        `[BuildingIndoor] Added ${ds.entities.values.length} unit labels (${smallUnits} small units) with interior positioning and donut-hole avoidance`
      );

      if (this.twoDLayeringManager && this.twoDLayeringManager.isInitialized) {
        this.twoDLayeringManager.processUnitLabels();
      }
    }
  }
  //////unit-labels/////

  ///Wall Visibility/////
  /**
   * Handle wall visibility state changes
   * @param {boolean} wallsVisible - New wall visibility state
   */
  handleWallVisibilityChange(wallsVisible) {
    // Re-apply current level filtering with new wall visibility
    const currentLevel = appState.getSelectedLevel();
    const currentKickMode = appState.getKickMode();

    console.log(
      `[BuildingIndoor] Applying wall visibility change (${wallsVisible}) to level ${currentLevel}`
    );
    this.filterFeaturesByLevel(currentLevel, currentKickMode);
  }
  ///Wall Visibility////

  ///Calculation/////
  // Calculate polygon center point //////
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

  // REPLACE the existing calculatePolygonCenter method with these enhanced methods:

  // NEW: Advanced polygon interior point calculation with simplified approach
  calculatePolygonInteriorPoint(coordinates, holes = []) {
    if (!coordinates || coordinates.length < 3) return null;

    // Method 1: Try geometric centroid first
    const centroid = this.calculateGeometricCentroid(coordinates);
    if (centroid && this.isPointInPolygon(centroid, coordinates, holes)) {
      return centroid;
    }

    // Method 2: Simplified grid-based search for interior point
    const gridPoint = this.findGridBasedInteriorPoint(coordinates, holes);
    if (gridPoint) {
      return gridPoint;
    }

    // Method 3: Fallback - edge-based interior point
    return this.findEdgeBasedInteriorPoint(coordinates, holes);
  }

  // Calculate true geometric centroid using polygon area formula
  calculateGeometricCentroid(coordinates) {
    let area = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const x1 = coordinates[i][0];
      const y1 = coordinates[i][1];
      const x2 = coordinates[i + 1][0];
      const y2 = coordinates[i + 1][1];

      const cross = x1 * y2 - x2 * y1;
      area += cross;
      centroidX += (x1 + x2) * cross;
      centroidY += (y1 + y2) * cross;
    }

    area *= 0.5;
    if (Math.abs(area) < 1e-10) return null; // Degenerate polygon

    centroidX /= 6 * area;
    centroidY /= 6 * area;

    return { lon: centroidX, lat: centroidY };
  }

  // Simplified grid-based search for best interior point
  findGridBasedInteriorPoint(polygon, holes = []) {
    // Get polygon bounding box
    const minX = Math.min(...polygon.map((p) => p[0]));
    const maxX = Math.max(...polygon.map((p) => p[0]));
    const minY = Math.min(...polygon.map((p) => p[1]));
    const maxY = Math.max(...polygon.map((p) => p[1]));

    // Grid resolution based on polygon size
    const width = maxX - minX;
    const height = maxY - minY;
    const gridSize = Math.max(
      5,
      Math.min(15, Math.floor(Math.sqrt(width * height) * 100000))
    ); // Adaptive grid

    const stepX = width / gridSize;
    const stepY = height / gridSize;

    let bestPoint = null;
    let bestDistance = 0;

    // Search grid points
    for (let i = 1; i < gridSize; i++) {
      for (let j = 1; j < gridSize; j++) {
        const point = {
          lon: minX + i * stepX,
          lat: minY + j * stepY,
        };

        if (this.isPointInPolygon(point, polygon, holes)) {
          const distanceToEdge = this.getDistanceToPolygonEdge(point, polygon);
          if (distanceToEdge > bestDistance) {
            bestDistance = distanceToEdge;
            bestPoint = point;
          }
        }
      }
    }

    return bestDistance > 0 ? bestPoint : null;
  }

  // Fallback: Find point by moving inward from polygon edges
  findEdgeBasedInteriorPoint(polygon, holes = []) {
    for (let i = 0; i < polygon.length - 1; i++) {
      const p1 = polygon[i];
      const p2 = polygon[i + 1];

      // Try points along the edge, moving inward
      for (let offset = 0.2; offset <= 0.8; offset += 0.3) {
        const edgePoint = {
          lon: p1[0] + (p2[0] - p1[0]) * offset,
          lat: p1[1] + (p2[1] - p1[1]) * offset,
        };

        // Move point inward (perpendicular to edge)
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          const inwardOffset = Math.min(0.0001, length * 0.1); // Adaptive inward movement
          const inwardPoint = {
            lon: edgePoint.lon + (dy / length) * inwardOffset,
            lat: edgePoint.lat - (dx / length) * inwardOffset,
          };

          if (this.isPointInPolygon(inwardPoint, polygon, holes)) {
            return inwardPoint;
          }
        }
      }
    }

    return null;
  }

  // Point-in-polygon test with holes support
  isPointInPolygon(point, polygon, holes = []) {
    // Check if point is inside main polygon
    if (!this.pointInPolygonRaycast(point, polygon)) {
      return false;
    }

    // Check if point is not inside any holes (for donut-shaped units)
    for (const hole of holes) {
      if (this.pointInPolygonRaycast(point, hole)) {
        return false; // Point is in hole, so not valid
      }
    }

    return true;
  }

  // Ray casting algorithm for point-in-polygon test
  pointInPolygonRaycast(point, polygon) {
    let inside = false;
    const x = point.lon;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Calculate minimum distance from point to polygon edge
  getDistanceToPolygonEdge(point, polygon) {
    let minDistance = Infinity;

    for (let i = 0; i < polygon.length - 1; i++) {
      const distance = this.getDistanceToLineSegment(
        point,
        { lon: polygon[i][0], lat: polygon[i][1] },
        { lon: polygon[i + 1][0], lat: polygon[i + 1][1] }
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  // Distance from point to line segment
  getDistanceToLineSegment(point, lineStart, lineEnd) {
    const dx = lineEnd.lon - lineStart.lon;
    const dy = lineEnd.lat - lineStart.lat;

    if (dx === 0 && dy === 0) {
      const dpx = point.lon - lineStart.lon;
      const dpy = point.lat - lineStart.lat;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.lon - lineStart.lon) * dx + (point.lat - lineStart.lat) * dy) /
          (dx * dx + dy * dy)
      )
    );

    const projectionX = lineStart.lon + t * dx;
    const projectionY = lineStart.lat + t * dy;

    const dpx = point.lon - projectionX;
    const dpy = point.lat - projectionY;

    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  // Calculate polygon area for size-based decisions
  calculatePolygonArea(coordinates) {
    let area = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const x1 = coordinates[i][0];
      const y1 = coordinates[i][1];
      const x2 = coordinates[i + 1][0];
      const y2 = coordinates[i + 1][1];
      area += x1 * y2 - x2 * y1;
    }
    return Math.abs(area) / 2;
  }

  ///Calculation/////

  // Create text canvas with transparent background
  createTextCanvas(text, maxWidth = 120, maxHeight = 24) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Start with smaller base font
    let fontSize = 14;
    context.font = `bold ${fontSize}px Arial, sans-serif`;

    // Measure text and adjust if needed
    let metrics = context.measureText(text);
    let textWidth = metrics.width;

    // Adjust font size to fit within maxWidth
    while (textWidth > maxWidth - 8 && fontSize > 7) {
      fontSize--;
      context.font = `bold ${fontSize}px Arial, sans-serif`;
      metrics = context.measureText(text);
      textWidth = metrics.width;
    }

    // Set canvas size based on text dimensions
    const padding = 6;
    canvas.width = Math.min(textWidth + padding, maxWidth);
    canvas.height = Math.min(fontSize + padding, maxHeight);

    // Re-apply font after canvas resize
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // // Semi-transparent background for better readability
    // context.fillStyle = "rgba(255, 255, 255, 0.8)";
    // context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 2);
    // context.fill();

    // Draw text outline for better contrast
    context.strokeStyle = "rgba(0, 0, 0, 0.9)";
    context.lineWidth = 1.2;
    context.strokeText(text, centerX, centerY);

    // Draw main text
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
    label.style.color = "white";
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
        levelId: levelId === "ALL" ? null : levelId,
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
    // Get current state
    const is2DMode = appState.isIn2DMode();
    const wallsVisible = appState.getWallsVisible();

    // If ALL, show everything with wall visibility logic
    if (levelId === "ALL") {
      Object.values(this.dataSources).forEach((ds) => {
        ds.entities.values.forEach((entity) => {
          const featureType = this.getEntityFeatureType(entity);

          if (["wall", "door", "window-wall"].includes(featureType)) {
            // Wall and door visibility: hidden in 2D mode OR when user toggles off
            entity.show = !is2DMode && wallsVisible;
          } else {
            // Other features: follow existing 2D mode logic
            entity.show = is2DMode
              ? !["wall", "door"].includes(featureType)
              : true;
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

        const featureType = this.getEntityFeatureType(entity);
        const levelVisible = allowedLevelIds.includes(entityLevelId);

        if (featureType === "wall" || featureType === "door") {
          // Wall and door visibility: must be level-visible AND (not in 2D mode) AND user wants walls visible
          entity.show = levelVisible && !is2DMode && wallsVisible;
        } else {
          // Other features: follow level filtering, hide walls/doors in 2D mode
          if (is2DMode) {
            entity.show =
              levelVisible && !["wall", "door"].includes(featureType);
          } else {
            entity.show = levelVisible;
          }
        }
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

    // Clean up 2D layering manager
    if (this.twoDLayeringManager) {
      if (this.twoDLayeringManager.isInitialized) {
        this.twoDLayeringManager.restore3DMode();
      }
      this.twoDLayeringManager = null;
    }

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

        // if (currentIndex < sortedLevels.length - 1) {
        //   // Not the top level - use distance to next level
        //   wallHeight = sortedLevels[currentIndex + 1] - currentZ;
        // }

        ///default 2.8m
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
        const doorEntity = this.createWallFromPolyline(
          opening.geometry.coordinates,
          currentZ,
          doorHeight,
          opening.id,
          "door",
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

  /**
   * Generate 3D window-walls for all windows in the building
   * Window-walls are 1m high walls that represent window frames
   * @returns {Array} Array of window-wall entities
   */
  generateWindowWalls() {
    if (!this.buildingData.levels || !this.buildingData.windows) {
      console.warn(
        "Cannot generate window-walls: missing levels or windows data"
      );
      return [];
    }

    // Create level height mapping
    const levelMap = new Map();
    this.buildingData.levels.features.forEach((level) => {
      levelMap.set(level.id, level.properties.zValue);
    });

    console.log(
      `Generating window-walls for ${this.buildingData.windows.features.length} windows across ${this.buildingData.levels.features.length} levels`
    );

    const windowWallEntities = [];
    const windowWallHeight = 1.0; // 1 meter high window-walls

    this.buildingData.windows.features.forEach((window, index) => {
      try {
        const currentZ = levelMap.get(window.properties.level_id);
        if (currentZ === undefined) {
          console.warn(
            `Window ${window.id} has invalid level_id: ${window.properties.level_id}`
          );
          return;
        }

        // Create window-wall entity using generic helper
        const windowWallEntity = this.createWallFromPolyline(
          window.geometry.coordinates,
          currentZ,
          windowWallHeight,
          window.properties.WindowID,
          "window-wall", // Feature type
          "default",
          window.properties
        );

        if (windowWallEntity) {
          windowWallEntities.push(windowWallEntity);
        }
      } catch (error) {
        console.error(
          `Error generating window-wall for window ${window.id}:`,
          error
        );
      }
    });

    console.log(
      `Successfully generated ${windowWallEntities.length} window-wall entities`
    );
    return windowWallEntities;
  }

  // Create a 3D door entity from a polyline's coordinates
  createWallFromPolyline(
    coordinates,
    baseHeight,
    wallHeight,
    featureId,
    featureType,
    category,
    properties = {}
  ) {
    if (!coordinates || coordinates.length < 2) {
      console.warn(`Invalid coordinates for ${featureType} ${featureId}`);
      return null;
    }

    try {
      // Convert polyline coordinates to Cesium format
      const points = [];
      coordinates.forEach((coord) => {
        if (coord.length >= 2) {
          points.push({ lon: coord[0], lat: coord[1] });
        }
      });

      if (points.length < 2) {
        console.warn(
          `Insufficient coordinates for ${featureType} ${featureId}`
        );
        return null;
      }

      // Create door as a thin rectangular polygon from the polyline
      // Use the polyline to create a thin rectangle representing the door
      const wallWidth = 0.1; // 10cm thick door
      const wallPolygon = this.createPolygonStripFromPolyline(
        points,
        wallWidth
      );

      if (!wallPolygon || wallPolygon.length < 3) {
        console.warn(
          `Failed to create polygon strip for ${featureType} ${featureId}`
        );
        return null;
      }

      // Convert to flat array for Cesium
      const wallPositions = [];
      wallPolygon.forEach((coord) => {
        wallPositions.push(coord.lon, coord.lat);
      });
      // Create Cesium positions from coordinates
      const cesiumPositions = Cesium.Cartesian3.fromDegreesArray(wallPositions);

      // Get style based on feature type and category
      let style;
      if (featureType === "door") {
        style = this.styles.door[category] || this.styles.door.default;
      } else if (featureType === "window-wall") {
        style = this.styles.window.default;
      } else {
        // Fallback to door style
        style = this.styles.door.default;
      }

      const newProperties = { ...properties };
      delete newProperties.feature_type;

      // Create wall entity
      const wallEntity = new Cesium.Entity({
        id: `${featureType}_${featureId}`,
        name: `${featureType} for ${properties.nameEn || featureId}`,
        polygon: {
          hierarchy: cesiumPositions,
          material: style.material,
          outline: style.outline,
          outlineColor: style.outlineColor,
          height: baseHeight,
          extrudedHeight: baseHeight + wallHeight,
          closeTop: false,
          closeBottom: true,
        },

        // Make clickable (unlike unit walls)
        properties:
          featureType === "door"
            ? {
                feature_type: featureType,
                parent_id: featureId,
                level_id: properties.level_id,
                zValue: baseHeight,
                wallHeight: wallHeight,
                category: category,
                venue_id: properties.venue_id,
                // Inherit all original properties
                ...newProperties,
              }
            : {
                feature_type: featureType,
                parent_id: featureId,
                // level_id: properties.level_id,
                zValue: baseHeight,
                wallHeight: wallHeight,
                category: "default",
                venue_id: properties.venue_id,
                // Inherit all original properties
                ...newProperties,
              },
      });

      return wallEntity;
    } catch (error) {
      console.error(
        `Error creating door entity for ${featureType} ${featureId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Create a polygon strip from a polyline with specified width
   * This creates a thick "band" following the polyline path
   * @param {Array} points - Array of {lon, lat} points
   * @param {number} widthMeters - Width of the strip in meters
   * @returns {Array} Array of {lon, lat} points forming a closed polygon
   */
  createPolygonStripFromPolyline(points, widthMeters) {
    if (!points || points.length < 2) {
      return null;
    }

    // Approximate conversion: 1 degree ≈ 111,000 meters at equator
    // For Hong Kong (latitude ~22°), we use a slightly adjusted factor
    const metersPerDegree = 111000;
    const widthDegrees = widthMeters / metersPerDegree;

    const leftSide = [];
    const rightSide = [];

    // For each segment of the polyline, calculate perpendicular offset
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      let perpX, perpY;

      if (i === 0) {
        // First point: use direction to next point
        const next = points[i + 1];
        const dx = next.lon - current.lon;
        const dy = next.lat - current.lat;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          perpX = ((-dy / length) * widthDegrees) / 2;
          perpY = ((dx / length) * widthDegrees) / 2;
        } else {
          perpX = 0;
          perpY = 0;
        }
      } else if (i === points.length - 1) {
        // Last point: use direction from previous point
        const prev = points[i - 1];
        const dx = current.lon - prev.lon;
        const dy = current.lat - prev.lat;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length > 0) {
          perpX = ((-dy / length) * widthDegrees) / 2;
          perpY = ((dx / length) * widthDegrees) / 2;
        } else {
          perpX = 0;
          perpY = 0;
        }
      } else {
        // Middle points: average the perpendicular from both adjacent segments
        const prev = points[i - 1];
        const next = points[i + 1];

        // Direction from previous to current
        const dx1 = current.lon - prev.lon;
        const dy1 = current.lat - prev.lat;
        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

        // Direction from current to next
        const dx2 = next.lon - current.lon;
        const dy2 = next.lat - current.lat;
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        // Calculate perpendiculars
        let perp1X = 0,
          perp1Y = 0,
          perp2X = 0,
          perp2Y = 0;

        if (len1 > 0) {
          perp1X = ((-dy1 / len1) * widthDegrees) / 2;
          perp1Y = ((dx1 / len1) * widthDegrees) / 2;
        }

        if (len2 > 0) {
          perp2X = ((-dy2 / len2) * widthDegrees) / 2;
          perp2Y = ((dx2 / len2) * widthDegrees) / 2;
        }

        // Average the perpendiculars for smooth corners
        perpX = (perp1X + perp2X) / 2;
        perpY = (perp1Y + perp2Y) / 2;
      }

      // Add offset points to both sides
      leftSide.push({
        lon: current.lon + perpX,
        lat: current.lat + perpY,
      });

      rightSide.push({
        lon: current.lon - perpX,
        lat: current.lat - perpY,
      });
    }

    // Combine left side + reversed right side to form closed polygon
    // Left side goes forward, right side goes backward to close the loop
    const polygon = [...leftSide, ...rightSide.reverse()];

    // Close the polygon by adding the first point at the end
    polygon.push({ ...leftSide[0] });

    return polygon;
  }
}
