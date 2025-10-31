/**
 * ViewManager2D - Manages 2D top-down view functionality for Cesium viewer
 * Handles camera controls, building focus, and integration with level selection
 */
export class ViewManager2D {
  constructor(viewer) {
    this.viewer = viewer;
    this.is2DMode = false;
    this.currentBuilding = null;
    this.savedCameraState = null;
    this.activeBuildingBounds = null;
    
    // Camera constraint settings for 2D mode
    this.constraints = {
      minimumZoom: 50,     // Minimum distance from ground
      maximumZoom: 500,    // Maximum distance from ground
      tiltRange: {         // Limit tilt to near-vertical for top-down view
        min: Cesium.Math.toRadians(-95),
        max: Cesium.Math.toRadians(-85)
      },
      enableRotation: true  // Allow Z-axis rotation
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
    if (this.is2DMode) {
      console.log('Already in 2D mode');
      return;
    }

    console.log(`Entering 2D mode for venue: ${venueId}`);
    
    // Store current camera state for restoration
    this.saveCameraState();
    
    // Store current building reference
    this.currentBuilding = buildingIndoor;
    
    // Calculate building bounds for optimal 2D view
    const bounds = this.calculateBuildingBounds(buildingIndoor);
    if (!bounds) {
      console.error('Cannot calculate building bounds for 2D view');
      return;
    }
    this.activeBuildingBounds = bounds;
    
    // Hide venue polygon for this building
    this.hideVenuePolygon(venueId);
    
    // Transition to 2D camera position
    await this.transitionTo2DCamera(bounds);
    
    // Apply 2D camera constraints
    this.apply2DConstraints();
    
    // Update mode state
    this.is2DMode = true;
    
    // Trigger UI updates
    this.notifyModeChange(true);
    
    console.log('Successfully entered 2D mode');
  }

  /**
   * Exit 2D mode and return to 3D view
   */
  async exit2DMode() {
    if (!this.is2DMode) {
      console.log('Not in 2D mode');
      return;
    }

    console.log('Exiting 2D mode');
    
    // Remove camera constraints
    this.remove2DConstraints();
    
    // Restore venue polygon visibility
    if (this.currentBuilding && this.activeBuildingBounds) {
      this.showVenuePolygon(this.activeBuildingBounds.venueId);
    }
    
    // Return to standard building overview
    await this.returnToStandardView();
    
    // Clear state
    this.is2DMode = false;
    this.currentBuilding = null;
    this.activeBuildingBounds = null;
    this.savedCameraState = null;
    
    // Trigger UI updates
    this.notifyModeChange(false);
    
    console.log('Successfully exited 2D mode');
  }

  /**
   * Toggle between 2D and 3D modes
   * @param {Object} buildingIndoor - The active BuildingIndoor instance
   * @param {string} venueId - The venue ID
   */
  async toggleMode(buildingIndoor, venueId) {
    console.log('[ViewManager2D] toggleMode called with:', { buildingIndoor, venueId, is2DMode: this.is2DMode });
    
    if (this.is2DMode) {
      console.log('[ViewManager2D] Currently in 2D mode, switching to 3D');
      await this.exit2DMode();
    } else {
      console.log('[ViewManager2D] Currently in 3D mode, switching to 2D');
      await this.enter2DMode(buildingIndoor, venueId);
    }
  }

  /**
   * Update 2D view when level selection changes
   * @param {string} levelId - The selected level ID
   * @param {boolean} kickMode - Whether to show levels below
   */
  update2DViewForLevel(levelId, kickMode) {
    if (!this.is2DMode || !this.currentBuilding || !this.activeBuildingBounds) {
      return;
    }

    // Recalculate optimal height based on level selection
    const levelHeight = this.calculateLevelHeight(levelId, kickMode);
    const optimalDistance = this.calculateOptimalDistance(this.activeBuildingBounds);
    
    // Update camera position to focus on the selected level
    this.viewer.scene.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        this.activeBuildingBounds.center.longitude,
        this.activeBuildingBounds.center.latitude,
        levelHeight + optimalDistance
      ),
      orientation: {
        heading: this.viewer.scene.camera.heading, // Preserve current rotation
        pitch: Cesium.Math.toRadians(-90), // Top-down view
        roll: 0
      }
    });
  }

  /**
   * Calculate building bounds from BuildingIndoor data
   * @param {Object} buildingIndoor - The BuildingIndoor instance
   * @returns {Object} Bounds object with center, rectangle, and metadata
   */
  calculateBuildingBounds(buildingIndoor) {
    console.log('[ViewManager2D] calculateBuildingBounds called with:', buildingIndoor);
    
    if (!buildingIndoor.buildingData || !buildingIndoor.buildingData.units) {
      console.error('[ViewManager2D] No building data or units found');
      return null;
    }

    const units = buildingIndoor.buildingData.units.features;
    if (units.length === 0) {
      console.error('[ViewManager2D] No units found in building data');
      return null;
    }
    
    console.log('[ViewManager2D] Found', units.length, 'units for bounds calculation');

    let minLon = Number.MAX_VALUE;
    let maxLon = Number.MIN_VALUE;
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minHeight = Number.MAX_VALUE;
    let maxHeight = Number.MIN_VALUE;

    // Calculate bounding box from all units
    units.forEach(unit => {
      if (unit.geometry && unit.geometry.coordinates) {
        const coords = unit.geometry.coordinates[0];
        coords.forEach(coord => {
          minLon = Math.min(minLon, coord[0]);
          maxLon = Math.max(maxLon, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });
      }
    });

    // Calculate height range from levels
    if (buildingIndoor.buildingData.levels) {
      buildingIndoor.buildingData.levels.features.forEach(level => {
        const zValue = level.properties.zValue;
        minHeight = Math.min(minHeight, zValue);
        maxHeight = Math.max(maxHeight, zValue);
      });
    }

    const center = {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      height: (minHeight + maxHeight) / 2
    };

    const rectangle = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat);

    return {
      center,
      rectangle,
      minHeight,
      maxHeight,
      venueId: units[0].properties.venue_id,
      width: maxLon - minLon,
      height: maxLat - minLat
    };
  }

  /**
   * Transition camera to 2D top-down view
   * @param {Object} bounds - Building bounds
   */
  async transitionTo2DCamera(bounds) {
    const optimalDistance = this.calculateOptimalDistance(bounds);
    
    const destination = Cesium.Cartesian3.fromDegrees(
      bounds.center.longitude,
      bounds.center.latitude,
      bounds.maxHeight + optimalDistance
    );

    return new Promise((resolve) => {
      this.viewer.scene.camera.flyTo({
        destination: destination,
        orientation: {
          heading: 0, // North-up orientation
          pitch: Cesium.Math.toRadians(-90), // Top-down view
          roll: 0
        },
        duration: 2.0,
        complete: resolve
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
    
    // Use field of view to calculate optimal distance
    const fov = this.viewer.scene.camera.frustum.fov;
    const distance = (maxDimension / 2) / Math.tan(fov / 2);
    
    // Add some padding and ensure it's within reasonable bounds
    const paddedDistance = distance * 1.2;
    return Math.max(this.constraints.minimumZoom, Math.min(paddedDistance, this.constraints.maximumZoom));
  }

  /**
   * Apply camera constraints for 2D mode
   */
  apply2DConstraints() {
    const scene = this.viewer.scene;
    const camera = scene.camera;
    
    // Store original camera settings
    this.originalCameraSettings = {
      minimumZoomDistance: scene.screenSpaceCameraController.minimumZoomDistance,
      maximumZoomDistance: scene.screenSpaceCameraController.maximumZoomDistance,
      enableTilt: scene.screenSpaceCameraController.enableTilt,
      enableLook: scene.screenSpaceCameraController.enableLook,
      constrainedAxis: camera.constrainedAxis
    };

    // Apply 2D constraints
    scene.screenSpaceCameraController.minimumZoomDistance = this.constraints.minimumZoom;
    scene.screenSpaceCameraController.maximumZoomDistance = this.constraints.maximumZoom;
    scene.screenSpaceCameraController.enableTilt = false; // Disable tilt
    scene.screenSpaceCameraController.enableLook = false; // Disable look
    
    // Constrain camera to Z-axis rotation only
    camera.constrainedAxis = Cesium.Cartesian3.UNIT_Z;
    
    // Add event handler to maintain top-down orientation
    this.maintain2DOrientation();
  }

  /**
   * Remove 2D camera constraints and restore original settings
   */
  remove2DConstraints() {
    if (!this.originalCameraSettings) return;

    const scene = this.viewer.scene;
    const camera = scene.camera;
    
    // Restore original settings
    scene.screenSpaceCameraController.minimumZoomDistance = this.originalCameraSettings.minimumZoomDistance;
    scene.screenSpaceCameraController.maximumZoomDistance = this.originalCameraSettings.maximumZoomDistance;
    scene.screenSpaceCameraController.enableTilt = this.originalCameraSettings.enableTilt;
    scene.screenSpaceCameraController.enableLook = this.originalCameraSettings.enableLook;
    camera.constrainedAxis = this.originalCameraSettings.constrainedAxis;
    
    // Remove event handlers
    this.remove2DEventHandlers();
    
    this.originalCameraSettings = null;
  }

  /**
   * Maintain 2D orientation by constraining pitch
   */
  maintain2DOrientation() {
    const handler = () => {
      const camera = this.viewer.scene.camera;
      const pitch = camera.pitch;
      
      // Keep pitch within top-down range
      if (pitch < this.constraints.tiltRange.min || pitch > this.constraints.tiltRange.max) {
        camera.setView({
          orientation: {
            heading: camera.heading,
            pitch: Cesium.Math.toRadians(-90),
            roll: camera.roll
          }
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
    this.cameraEventHandlers.forEach(handler => {
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
      right: camera.right.clone()
    };
  }

  /**
   * Return to standard building overview
   */
  async returnToStandardView() {
    if (!this.activeBuildingBounds) return;

    const bounds = this.activeBuildingBounds;
    const standardDistance = this.calculateOptimalDistance(bounds) * 1.5;
    
    return new Promise((resolve) => {
      this.viewer.scene.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          bounds.center.longitude,
          bounds.center.latitude,
          bounds.center.height + standardDistance
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45), // 45-degree angle for overview
          roll: 0
        },
        duration: 1.5,
        complete: resolve
      });
    });
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
    
    if (levelId === 'ALL') {
      return this.activeBuildingBounds.center.height;
    }

    const selectedLevel = levels.find(level => level.id === levelId);
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
      ds => ds.name === 'venue_polygon'
    );

    venueDataSources.forEach(dataSource => {
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
      ds => ds.name === 'venue_polygon'
    );

    venueDataSources.forEach(dataSource => {
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
  notifyModeChange(is2D) {
    // Dispatch custom event for UI components to listen
    const event = new CustomEvent('viewModeChanged', {
      detail: { is2DMode: is2D, viewManager: this }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get current mode state
   * @returns {boolean} True if in 2D mode
   */
  isIn2DMode() {
    return this.is2DMode;
  }

  /**
   * Get current building reference
   * @returns {Object} Current BuildingIndoor instance
   */
  getCurrentBuilding() {
    return this.currentBuilding;
  }

  /**
   * Cleanup method for proper disposal
   */
  destroy() {
    if (this.is2DMode) {
      this.exit2DMode();
    }
    
    this.remove2DEventHandlers();
    this.viewer = null;
    this.currentBuilding = null;
    this.savedCameraState = null;
    this.activeBuildingBounds = null;
  }
}