import { appState } from "../shared/AppState.js";

/**
 * ViewManager2D - Manages 2D top-down view functionality for Cesium viewer
 * Handles camera controls, building focus, and integration with level selection
 *
 * Now integrated with centralized AppState - no local state management
 */
export class ViewManager2D {
  constructor(viewer) {
    this.viewer = viewer;
    // Removed: this.is2DMode - now uses appState.isIn2DMode()
    this.currentBuilding = null;
    this.savedCameraState = null;
    this.activeBuildingBounds = null;

    // Camera constraint settings for 2D mode
    this.constraints = {
      // No zoom limits - complete freedom as requested
      minimumZoom: 0.1, // Very close zoom allowed
      maximumZoom: Number.MAX_VALUE, // No maximum limit
      tiltRange: {
        // Tolerance range for pitch corrections
        min: Cesium.Math.toRadians(-95),
        max: Cesium.Math.toRadians(-85),
      },
      enableRotation: true, // Allow free 360° Z-axis rotation
      rotationSensitivity: 1.0, // Normal rotation sensitivity
    };

    // Event handlers for camera controls
    this.cameraEventHandlers = [];
    this.originalCameraSettings = null;
  }

  /**
   * Enter 2D top-down view mode for the specified building
   * @param {Object} buildingIndoor - The BuildingIndoor instance
   * @param {string} venueId - The venue ID
   */
  async enter2DMode(buildingIndoor, venueId) {
    console.log(`[ViewManager2D] 🚀 Entering 2D mode for venue: ${venueId}`);
    console.log(`[ViewManager2D] 📋 Parameters received:`, {
      buildingIndoor: !!buildingIndoor,
      buildingType: buildingIndoor ? buildingIndoor.constructor.name : "N/A",
      venueId: venueId,
      currentAppState: appState.isIn2DMode(),
    });

    // Note: Don't return early if already in 2D state - the ViewControllerManager
    // manages the state transitions and we need to execute the view operations

    // Store current camera state for restoration
    this.saveCameraState();

    // Store current building reference
    this.currentBuilding = buildingIndoor;

    // Calculate building bounds for optimal 2D view
    console.log("[ViewManager2D] 📐 Calculating building bounds...");
    const bounds = this.calculateBuildingBounds(buildingIndoor);
    if (!bounds) {
      console.error(
        "[ViewManager2D] ❌ Cannot calculate building bounds for 2D view"
      );
      console.error("[ViewManager2D] 🏗️ Building data structure:", {
        hasBuilding: !!buildingIndoor,
        hasBuildingData: !!buildingIndoor?.buildingData,
        hasUnits: !!buildingIndoor?.buildingData?.units,
        unitsType: typeof buildingIndoor?.buildingData?.units,
        unitsLength: buildingIndoor?.buildingData?.units?.features?.length,
      });
      return;
    }
    this.activeBuildingBounds = bounds;
    console.log("[ViewManager2D] ✅ Building bounds calculated:", {
      center: bounds.center,
      width: bounds.width,
      height: bounds.height,
    });

    // Note: Venue polygon should already be hidden when building is loaded
    // Following existing pattern in demo-main-server.js where venue is hidden on building selection

    // Transition to 2D camera position
    console.log("[ViewManager2D] 🎬 Starting camera transition...");
    await this.transitionTo2DCamera(bounds);
    console.log("[ViewManager2D] ✅ Camera transition completed");

    // Apply 2D camera constraints
    console.log("[ViewManager2D] 🔒 Applying 2D constraints...");
    this.apply2DConstraints();
    console.log("[ViewManager2D] ✅ 2D constraints applied");

    ////determine which level to label/////
    const selectedLevel = appState.getSelectedLevel();
    const levels = this.getSortedLevels(buildingIndoor);

    let levelId = null;
    if (selectedLevel && selectedLevel !== "ALL") {
      levelId = selectedLevel;
    } else if (levels.length > 0) {
      levelId = levels[0].id; // highest level
    }

    appState.setUnitLabelState({
      active: !!levelId,
      venueId,
      levelId,
    });
    ////determine which level to label/////
    // State is managed centrally - no local state updates needed
    // The ViewControllerManager will handle state updates

    console.log(
      "[ViewManager2D] ✅ Successfully entered 2D mode - all operations completed"
    );
  }

  /**
   * Exit 2D mode and return to 3D view
   */
  async exit2DMode() {
    console.log("[ViewManager2D] 🚀 Exiting 2D mode");

    // Note: Don't check state here - the ViewControllerManager manages state transitions
    // and we need to execute the view operations regardless of current state
    appState.resetUnitLabelState();
    // Remove camera constraints
    this.remove2DConstraints();

    // NOTE: Do NOT restore venue polygon visibility
    // Following the existing pattern where venue remains hidden when building is selected
    // The venue should stay hidden as per the current activeBuildings behavior

    // Return to standard building overview
    await this.returnToStandardView();

    // Clear local state (but not centralized state)
    this.currentBuilding = null;
    this.activeBuildingBounds = null;
    this.savedCameraState = null;

    // State management is handled centrally - no local state updates needed

    console.log(
      "[ViewManager2D] Successfully exited 2D mode - venue remains hidden as expected"
    );
  }

  /**
   * Toggle between 2D and 3D modes
   * @param {Object} buildingIndoor - The active BuildingIndoor instance
   * @param {string} venueId - The venue ID
   */
  async toggleMode(buildingIndoor, venueId) {
    console.log("[ViewManager2D] toggleMode called with:", {
      buildingIndoor,
      venueId,
      is2DMode: appState.isIn2DMode(),
    });

    if (appState.isIn2DMode()) {
      console.log("[ViewManager2D] Currently in 2D mode, switching to 3D");
      await this.exit2DMode();
    } else {
      console.log("[ViewManager2D] Currently in 3D mode, switching to 2D");
      await this.enter2DMode(buildingIndoor, venueId);
    }
  }

  /**
   * Update 2D view when level selection changes
   * @param {string} levelId - The selected level ID
   * @param {boolean} kickMode - Whether to show levels below
   */
  update2DViewForLevel(levelId, kickMode) {
    if (
      !appState.isIn2DMode() ||
      !this.currentBuilding ||
      !this.activeBuildingBounds
    ) {
      return;
    }

    // Recalculate optimal height and distance based on level selection
    const levelHeight = this.calculateLevelHeight(levelId, kickMode);
    let optimalDistance;

    if (levelId === "ALL") {
      // Show entire building from above
      optimalDistance =
        this.calculateOptimalDistance(this.activeBuildingBounds) * 1.2;
    } else {
      // Show specific level - closer view for level details
      optimalDistance =
        this.calculateOptimalDistance(this.activeBuildingBounds) * 0.8;
    }

    // Smooth transition to new camera position
    this.viewer.scene.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        this.activeBuildingBounds.center.longitude,
        this.activeBuildingBounds.center.latitude,
        levelHeight + optimalDistance
      ),
      orientation: {
        heading: this.viewer.scene.camera.heading, // Preserve current rotation
        pitch: Cesium.Math.toRadians(-90), // Top-down view
        roll: 0,
      },
      duration: 1.0,
    });
  }

  /**
   * Calculate building bounds from BuildingIndoor data
   * @param {Object} buildingIndoor - The BuildingIndoor instance
   * @returns {Object} Bounds object with center, rectangle, and metadata
   */
  calculateBuildingBounds(buildingIndoor) {
    console.log(
      "[ViewManager2D] calculateBuildingBounds called with:",
      buildingIndoor
    );
    const venueGeoJson = appState.getVenueGeoJson();
    const mult = venueGeoJson.features.find(
      (v) => v.geometry.type === "MultiPolygon"
    );
    const matchedVenue = venueGeoJson.features.find(
      (f) => f.id === buildingIndoor.buildingData.venue_id
    );

    if (!matchedVenue || !buildingIndoor.buildingData) {
      console.error("[ViewManager2D] No building data or units found");
      return null;
    }

    let minLon = Number.MAX_VALUE;
    let maxLon = Number.MIN_VALUE;
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minHeight = matchedVenue.properties.min_height;
    let maxHeight = matchedVenue.properties.height;

    // Calculate bounding box from all units
    if (matchedVenue.geometry.type === "Polygon") {
      matchedVenue.geometry.coordinates[0].forEach((coord) => {
        minLon = Math.min(minLon, coord[0]);
        maxLon = Math.max(maxLon, coord[0]);
        minLat = Math.min(minLat, coord[1]);
        maxLat = Math.max(maxLat, coord[1]);
      });
    } else if (matchedVenue.geometry.type === "MultiPolygon") {
      let coordinates = [];
      matchedVenue.geometry.coordinates.forEach((c) => {});
    }

    const center = {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      height: (minHeight + maxHeight) / 2,
    };

    const rectangle = Cesium.Rectangle.fromDegrees(
      minLon,
      minLat,
      maxLon,
      maxLat
    );

    return {
      center,
      rectangle,
      minHeight,
      maxHeight,
      venueId: matchedVenue.id,
      width: maxLon - minLon,
      height: maxLat - minLat,
    };
  }

  /**
   * Transition camera to 2D top-down view
   * @param {Object} bounds - Building bounds
   */
  async transitionTo2DCamera(bounds) {
    // Calculate optimal distance to see entire building level
    const optimalDistance = this.calculateOptimalDistance(bounds);

    // Position camera above the center of the building
    const destination = Cesium.Cartesian3.fromDegrees(
      bounds.center.longitude,
      bounds.center.latitude,
      bounds.center.height + optimalDistance
    );

    return new Promise((resolve) => {
      this.viewer.scene.camera.flyTo({
        destination: destination,
        orientation: {
          heading: 0, // Start with north-up orientation
          pitch: Cesium.Math.toRadians(-90), // Perfect top-down view
          roll: 0,
        },
        duration: 2.0,
        complete: () => {
          console.log(
            "[ViewManager2D] 2D camera transition complete - Z-axis rotation now available"
          );
          resolve();
        },
      });
    });
  }

  /**
   * Calculate optimal camera distance for 2D view
   * @param {Object} bounds - Building bounds
   * @returns {number} Optimal distance in meters
   */
  calculateOptimalDistance(bounds) {
    // Calculate distance to fit entire building in view
    const rectangle = bounds.rectangle;
    const width = Cesium.Rectangle.computeWidth(rectangle);
    const height = Cesium.Rectangle.computeHeight(rectangle);
    const maxDimension = Math.max(width, height);

    // Use field of view to calculate optimal distance with better padding
    const fov = this.viewer.scene.camera.frustum.fov;
    const distance = maxDimension / 2 / Math.tan(fov / 2);

    // Add generous padding for better overview (1.5x instead of 1.2x)
    const paddedDistance = distance * 2.5;

    // Ensure minimum distance for usability but allow unlimited zoom
    return Math.max(200, paddedDistance); // Minimum 50m, no maximum
  }

  /**
   * Apply camera constraints for 2D mode
   */
  apply2DConstraints() {
    const scene = this.viewer.scene;
    const camera = scene.camera;
    const controller = scene.screenSpaceCameraController;

    // Store original camera settings
    this.originalCameraSettings = {
      minimumZoomDistance: controller.minimumZoomDistance,
      maximumZoomDistance: controller.maximumZoomDistance,
      enableTilt: controller.enableTilt,
      enableLook: controller.enableLook,
      enableRotate: controller.enableRotate,
      enableZoom: controller.enableZoom,
      enableTranslate: controller.enableTranslate,
      constrainedAxis: camera.constrainedAxis,
      inertiaSpin: controller.inertiaSpin,
      inertiaTranslate: controller.inertiaTranslate,
      inertiaZoom: controller.inertiaZoom,
    };

    // Apply 2D constraints - enable all interactions but constrain orientation
    controller.minimumZoomDistance = this.constraints.minimumZoom;
    controller.maximumZoomDistance = this.constraints.maximumZoom;
    controller.enableTilt = false; // Disable tilt to maintain top-down view
    controller.enableLook = false; // Disable look to maintain top-down view
    controller.enableRotate = true; // Enable rotation for Z-axis spinning
    controller.enableZoom = true; // Enable zoom with no limits
    controller.enableTranslate = true; // Enable panning/dragging

    // Enable inertia for smooth interactions
    controller.inertiaSpin = 0.9;
    controller.inertiaTranslate = 0.9;
    controller.inertiaZoom = 0.8;

    // Configure camera for Z-axis rotation only
    camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;

    // Ensure proper mouse button mapping for rotation
    controller.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG;
    controller.translateEventTypes = [
      Cesium.CameraEventType.RIGHT_DRAG,
      Cesium.CameraEventType.MIDDLE_DRAG,
    ];
    controller.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
    ];

    // Add event handler to maintain top-down orientation while allowing Z-rotation
    this.maintain2DOrientation();

    console.log(
      "[ViewManager2D] 2D constraints applied - free Z-rotation and zoom enabled"
    );
    console.log(
      "[ViewManager2D] Try mouse drag to rotate around Z-axis, or use: window.mapSidebar.viewManager2D.testZRotation(45)"
    );
  }

  /**
   * Remove 2D camera constraints and restore original settings
   */
  remove2DConstraints() {
    if (!this.originalCameraSettings) return;

    const scene = this.viewer.scene;
    const camera = scene.camera;
    const controller = scene.screenSpaceCameraController;

    // Restore original settings
    controller.minimumZoomDistance =
      this.originalCameraSettings.minimumZoomDistance;
    controller.maximumZoomDistance =
      this.originalCameraSettings.maximumZoomDistance;
    controller.enableTilt = this.originalCameraSettings.enableTilt;
    controller.enableLook = this.originalCameraSettings.enableLook;
    controller.enableRotate = this.originalCameraSettings.enableRotate;
    controller.enableZoom = this.originalCameraSettings.enableZoom;
    controller.enableTranslate = this.originalCameraSettings.enableTranslate;
    controller.inertiaSpin = this.originalCameraSettings.inertiaSpin;
    controller.inertiaTranslate = this.originalCameraSettings.inertiaTranslate;
    controller.inertiaZoom = this.originalCameraSettings.inertiaZoom;
    camera.constrainedAxis = this.originalCameraSettings.constrainedAxis;

    // Remove event handlers
    this.remove2DEventHandlers();

    this.originalCameraSettings = null;

    console.log(
      "[ViewManager2D] 2D constraints removed - full 3D camera control restored"
    );
  }

  getSortedLevels(buildingIndoor) {
    const levels = buildingIndoor?.buildingData?.levels?.features ?? [];
    return levels
      .slice()
      .sort((a, b) => b.properties.zValue - a.properties.zValue);
  }

  /**
   * Maintain 2D orientation by constraining pitch while allowing heading rotation
   */
  maintain2DOrientation() {
    const handler = () => {
      const camera = this.viewer.scene.camera;
      const pitch = camera.pitch;

      // Only correct pitch if it deviates significantly from top-down view
      // Allow small variations to prevent jittery corrections
      const targetPitch = Cesium.Math.toRadians(-90);
      const tolerance = Cesium.Math.toRadians(5); // 5 degree tolerance

      if (Math.abs(pitch - targetPitch) > tolerance) {
        // Only correct the pitch, preserve heading (Z-rotation) and position
        const currentPosition = camera.position.clone();
        const currentHeading = camera.heading; // Preserve user's rotation

        camera.setView({
          destination: currentPosition,
          orientation: {
            heading: currentHeading, // Keep current Z-axis rotation
            pitch: targetPitch, // Reset to top-down
            roll: 0, // Always reset roll
          },
        });
      }
    };

    this.cameraEventHandlers.push(handler);
    this.viewer.scene.camera.changed.addEventListener(handler);
  }

  /**
   * Remove 2D event handlers
   */
  remove2DEventHandlers() {
    this.cameraEventHandlers.forEach((handler) => {
      this.viewer.scene.camera.changed.removeEventListener(handler);
    });
    this.cameraEventHandlers = [];
  }

  /**
   * Save current camera state for restoration
   */
  saveCameraState() {
    const camera = this.viewer.scene.camera;
    this.savedCameraState = {
      position: camera.position.clone(),
      direction: camera.direction.clone(),
      up: camera.up.clone(),
      right: camera.right.clone(),
    };
  }

  /**
   * Return to standard building overview (3D view of entire building)
   */
  async returnToStandardView() {
    if (!this.activeBuildingBounds) return;

    const bounds = this.activeBuildingBounds;
    const venue_id = this.currentBuilding.buildingData.venue_id;
    const building = appState.getActiveBuilding(venue_id);

    if (building.dataSources && building.dataSources.units) {
      const unitsDataSource = building.dataSources.units;
      if (unitsDataSource.entities.values.length > 0) {
        await viewer.flyTo(unitsDataSource.entities.values, {
          duration: 2.0,
          offset: new Cesium.HeadingPitchRange(0, -0.5, 0),
        });
      }
    }
  }

  /**
   * Calculate level height for 2D view positioning
   * @param {string} levelId - Selected level ID
   * @param {boolean} kickMode - Whether to show levels below
   * @returns {number} Calculated height
   */
  calculateLevelHeight(levelId, kickMode) {
    if (!this.currentBuilding || !this.currentBuilding.buildingData.levels) {
      return 0;
    }

    const levels = this.currentBuilding.buildingData.levels.features;

    if (levelId === "ALL") {
      return this.activeBuildingBounds.center.height;
    }

    const selectedLevel = levels.find((level) => level.id === levelId);
    if (!selectedLevel) {
      return this.activeBuildingBounds.center.height;
    }

    return selectedLevel.properties.zValue;
  }

  /**
   * Hide venue polygon for the specified venue ID
   * @param {string} venueId - The venue ID to hide
   */
  hideVenuePolygon(venueId) {
    const venueDataSources = this.viewer.dataSources._dataSources.filter(
      (ds) => ds.name === "venue_polygon"
    );

    venueDataSources.forEach((dataSource) => {
      const venueEntity = dataSource.entities.getById(venueId);
      if (venueEntity) {
        venueEntity.show = false;
        console.log(`Hidden venue polygon for venue: ${venueId}`);
      }
    });
  }

  /**
   * Show venue polygon for the specified venue ID
   * @param {string} venueId - The venue ID to show
   */
  showVenuePolygon(venueId) {
    const venueDataSources = this.viewer.dataSources._dataSources.filter(
      (ds) => ds.name === "venue_polygon"
    );

    venueDataSources.forEach((dataSource) => {
      const venueEntity = dataSource.entities.getById(venueId);
      if (venueEntity) {
        venueEntity.show = true;
        console.log(`Restored venue polygon for venue: ${venueId}`);
      }
    });
  }

  /**
   * Notify other components about mode changes
   * @param {boolean} is2D - Whether entering 2D mode
   */
  // Removed notifyModeChange - state changes are handled centrally by AppState

  /**
   * Get current mode state
   * @returns {boolean} True if in 2D mode
   */
  isIn2DMode() {
    return appState.isIn2DMode();
  }

  /**
   * Get current building reference
   * @returns {Object} Current BuildingIndoor instance
   */
  getCurrentBuilding() {
    return this.currentBuilding;
  }

  /**
   * Test Z-axis rotation functionality
   * @param {number} degrees - Degrees to rotate (for testing)
   */
  testZRotation(degrees = 45) {
    if (!appState.isIn2DMode()) {
      console.log("[ViewManager2D] Not in 2D mode - cannot test Z rotation");
      return;
    }

    const camera = this.viewer.scene.camera;
    const newHeading = camera.heading + Cesium.Math.toRadians(degrees);

    camera.setView({
      orientation: {
        heading: newHeading,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
    });

    console.log(
      `[ViewManager2D] Rotated ${degrees}° around Z-axis. New heading: ${Cesium.Math.toDegrees(
        newHeading
      )}°`
    );
  }

  /**
   * Cleanup method for proper disposal
   */
  destroy() {
    if (appState.isIn2DMode()) {
      this.exit2DMode();
    }

    this.remove2DEventHandlers();
    this.viewer = null;
    this.currentBuilding = null;
    this.savedCameraState = null;
    this.activeBuildingBounds = null;
  }
}
