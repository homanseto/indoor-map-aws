// File: public/js/controllers/TwoDLayeringManager.js (HEIGHT-FOCUSED VERSION)
/**
 * Height-Based 2D Layering Manager
 * Focuses on height separation to prevent Z-fighting and ensure visibility
 */

import { appState } from "../shared/AppState.js";

export class TwoDLayeringManager {
  constructor(viewer, buildingIndoor) {
    this.viewer = viewer;
    this.buildingIndoor = buildingIndoor;
    this.isInitialized = false;

    // Store original properties for restoration
    this.originalProperties = new Map();

    // Height layers to prevent Z-fighting (in meters above ground)
    this.heightLayers = {
      units: 0.0, // Ground level
      openings: 0.8, // 10cm above ground
      windows: 1.2, // 20cm above ground
      unitLabels: 0.6,
      amenities: 1.6, // 30cm above ground
      occupants: 2.0, // 40cm above ground
    };

    console.log(
      "[2DLayeringManager] Height-focused manager initialized for building:",
      buildingIndoor.venueId
    );
  }

  /**
   * Apply 2D mode with height-based separation
   */
  async apply2DMode() {
    if (this.isInitialized) {
      console.log("[2DLayeringManager] 2D mode already applied");
      return;
    }

    console.log("[2DLayeringManager] Applying height-based 2D mode...");

    try {
      // Step 1: Store original properties for restoration
      this.storeOriginalProperties();

      // Step 2: Hide walls and doors (they're not needed in 2D)
      this.hideWallsAndDoors();

      // Step 3: Flatten unit polygons
      this.flattenUnitPolygons();

      // Step 4: Apply height-based positioning to prevent Z-fighting
      this.applyHeightBasedPositioning();

      // Step 5: NEW - Process unit labels with proper height and scaling
      this.processUnitLabels();

      this.isInitialized = true;
      console.log(
        "[2DLayeringManager] ✅ Height-based 2D mode applied successfully"
      );
    } catch (error) {
      console.error("[2DLayeringManager] ❌ Error applying 2D mode:", error);
    }
  }

  /**
   * Process unit labels with height-based positioning for 2D mode
   */
  processUnitLabels() {
    console.log("[2DLayeringManager] Processing unit labels...");

    const unitLabelDataSource = this.buildingIndoor.unitLabelDataSource;
    if (!unitLabelDataSource) {
      console.log("[2DLayeringManager] No unit labels data source found");
      return;
    }

    let processedCount = 0;
    unitLabelDataSource.entities.values.forEach((entity) => {
      if (entity.label && entity.position) {
        try {
          // Get current position
          const currentPos = entity.position.getValue
            ? entity.position.getValue(Cesium.JulianDate.now())
            : entity.position;

          if (currentPos) {
            // Extract lat/lng and create new position with unit label height
            const cartographic = Cesium.Cartographic.fromCartesian(currentPos);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);

            // Create new elevated position for unit labels
            entity.position = Cesium.Cartesian3.fromDegrees(
              longitude,
              latitude,
              this.heightLayers.unitLabels
            );

            // Configure label for 2D visibility with distance-based scaling
            entity.label.heightReference = Cesium.HeightReference.NONE;
            entity.label.disableDepthTestDistance =
              Number.POSITIVE_INFINITY;

            // ✅ Apply consistent scaling for labels (matches building-indoor.js)
            entity.label.scaleByDistance = new Cesium.NearFarScalar(
              50,   // Near distance: 50m
              1.5,  // Near scale: 1.5x when zoomed in
              400,  // Far distance: 400m
              0.3   // Far scale: 0.3x when zoomed out
            );

            processedCount++;
          }
        } catch (error) {
          console.warn(
            `[2DLayeringManager] Error processing unit label entity ${entity.id}:`,
            error
          );
        }
      }
    });

    console.log(
      `[2DLayeringManager] ✅ Processed ${processedCount} unit label entities`
    );
  }

  /**
   * Restore 3D mode
   */
  async restore3DMode() {
    if (!this.isInitialized) {
      console.log("[2DLayeringManager] 3D mode already active");
      return;
    }

    console.log("[2DLayeringManager] Restoring 3D mode...");

    try {
      // Restore all original properties
      this.restoreOriginalProperties();

      this.isInitialized = false;
      console.log("[2DLayeringManager] ✅ 3D mode restored successfully");
    } catch (error) {
      console.error("[2DLayeringManager] ❌ Error restoring 3D mode:", error);
    }
  }

  /**
   * Store original properties for restoration
   */
  storeOriginalProperties() {
    console.log("[2DLayeringManager] Storing original properties...");

    Object.values(this.buildingIndoor.dataSources || {}).forEach(
      (dataSource) => {
        dataSource.entities.values.forEach((entity) => {
          if (!this.originalProperties.has(entity.id)) {
            const props = {
              show: entity.show,
              position: entity.position,
            };

            if (entity.billboard) {
              props.billboard = {
                heightReference: entity.billboard.heightReference,
                // disableDepthTestDistance:
                //   entity.billboard.disableDepthTestDistance,
                disableDepthTestDistance: 0,
              };
            }

            if (entity.polygon) {
              props.polygon = {
                height: entity.polygon.height,
                extrudedHeight: entity.polygon.extrudedHeight,
              };
            }

            if (entity.polyline) {
              props.polyline = {
                positions: entity.polyline.positions,
                clampToGround: entity.polyline.clampToGround,
                depthFailMaterial: null, // Add this
                zIndex: null, // Add this
                width: entity.polyline.width,
              };
            }

            this.originalProperties.set(entity.id, props);
          }
        });
      }
    );

    console.log(
      `[2DLayeringManager] Stored ${this.originalProperties.size} original properties`
    );
  }

  /**
   * Hide walls and doors in 2D mode
   */
  hideWallsAndDoors() {
    console.log("[2DLayeringManager] Hiding walls and doors...");

    let hiddenCount = 0;

    // Hide walls
    const wallsDataSource = this.buildingIndoor.dataSources.walls;
    if (wallsDataSource) {
      wallsDataSource.entities.values.forEach((entity) => {
        entity.show = false;
        hiddenCount++;
      });
    }

    // Hide doors
    const doorsDataSource = this.buildingIndoor.dataSources.doors;
    if (doorsDataSource) {
      doorsDataSource.entities.values.forEach((entity) => {
        entity.show = false;
        hiddenCount++;
      });
    }

    console.log(`[2DLayeringManager] ✅ Hidden ${hiddenCount} walls and doors`);
  }

  /**
   * Apply height-based positioning to prevent Z-fighting
   */
  applyHeightBasedPositioning() {
    console.log("[2DLayeringManager] Applying height-based positioning...");

    // Process amenities (point features with billboards)
    this.processPointFeatures("amenities", this.heightLayers.amenities);
    this.processPointFeatures("occupants", this.heightLayers.occupants);

    // Process line features (openings and windows)
    this.processLineFeatures("openings", this.heightLayers.openings);
    this.processLineFeatures("windows", this.heightLayers.windows);

    console.log("[2DLayeringManager] ✅ Height-based positioning applied");
  }

  /**
   * Process point features (amenities, occupants) with height separation
   */
  processPointFeatures(dataSourceName, height) {
    const dataSource = this.buildingIndoor.dataSources[dataSourceName];
    if (!dataSource) {
      console.log(`[2DLayeringManager] No ${dataSourceName} data source found`);
      return;
    }

    let processedCount = 0;
    console.log(
      `[2DLayeringManager] Processing ${dataSourceName} at height ${height}m...`
    );

    dataSource.entities.values.forEach((entity) => {
      if (entity.billboard && entity.position) {
        try {
          // Get current position
          const currentPos = entity.position.getValue
            ? entity.position.getValue(Cesium.JulianDate.now())
            : entity.position;

          if (currentPos) {
            // Extract lat/lng and create new position with specified height
            const cartographic = Cesium.Cartographic.fromCartesian(currentPos);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);

            // Create new elevated position
            entity.position = Cesium.Cartesian3.fromDegrees(
              longitude,
              latitude,
              height
            );

            // Configure billboard for 2D visibility
            entity.billboard.heightReference = Cesium.HeightReference.NONE; // Don't clamp to ground
            entity.billboard.disableDepthTestDistance =
              Number.POSITIVE_INFINITY;

            processedCount++;
          }
        } catch (error) {
          console.warn(
            `[2DLayeringManager] Error processing ${dataSourceName} entity ${entity.id}:`,
            error
          );
        }
      }
    });

    console.log(
      `[2DLayeringManager] ✅ Processed ${processedCount} ${dataSourceName} entities`
    );
  }

  /**
   * Process line features (openings, windows) with height separation
   */
  processLineFeatures(dataSourceName, height) {
    const dataSource = this.buildingIndoor.dataSources[dataSourceName];
    if (!dataSource) {
      console.log(`[2DLayeringManager] No ${dataSourceName} data source found`);
      return;
    }

    let processedCount = 0;
    console.log(
      `[2DLayeringManager] Processing ${dataSourceName} lines at height ${height}m...`
    );

    dataSource.entities.values.forEach((entity) => {
      if (entity.polyline) {
        try {
          // Get current positions
          const currentPositions = entity.polyline.positions.getValue
            ? entity.polyline.positions.getValue(Cesium.JulianDate.now())
            : entity.polyline.positions;

          if (currentPositions && Array.isArray(currentPositions)) {
            // Create elevated positions
            const elevatedPositions = currentPositions.map((pos) => {
              const cartographic = Cesium.Cartographic.fromCartesian(pos);
              const longitude = Cesium.Math.toDegrees(cartographic.longitude);
              const latitude = Cesium.Math.toDegrees(cartographic.latitude);
              return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
            });
            entity.allowPicking = true;
            // Apply elevated positions
            entity.polyline.positions = elevatedPositions;
            entity.polyline.clampToGround = false; // Don't clamp - we have explicit height

            // Enhance line width for better visibility in 2D
            const currentWidth = entity.polyline.width || 1;
            entity.polyline.width = Math.max(2, currentWidth * 1.2);

            // Ensure lines render on top
            entity.polyline.depthFailMaterial = entity.polyline.material;
            entity.polyline.zIndex = 100; // If supported

            processedCount++;
          }
        } catch (error) {
          console.warn(
            `[2DLayeringManager] Error processing ${dataSourceName} entity ${entity.id}:`,
            error
          );
        }
      }
    });

    console.log(
      `[2DLayeringManager] ✅ Processed ${processedCount} ${dataSourceName} entities`
    );
  }

  /**
   * Flatten unit polygons for 2D mode
   */
  flattenUnitPolygons() {
    console.log("[2DLayeringManager] Flattening unit polygons...");

    const unitsDataSource = this.buildingIndoor.dataSources.units;
    if (!unitsDataSource) {
      console.log("[2DLayeringManager] No units data source found");
      return;
    }

    let flattenedCount = 0;
    unitsDataSource.entities.values.forEach((entity) => {
      if (entity.polygon) {
        // Set units to ground level (0.0m) and remove extrusion
        entity.polygon.height = this.heightLayers.units;
        entity.polygon.extrudedHeight = undefined;

        // Enhance outline for better separation
        entity.polygon.outline = true;
        entity.polygon.outlineWidth = 1;

        flattenedCount++;
      }
    });

    console.log(
      `[2DLayeringManager] ✅ Flattened ${flattenedCount} unit polygons`
    );
  }

  /**
   * Restore original properties
   */
  restoreOriginalProperties() {
    console.log("[2DLayeringManager] Restoring original properties...");

    let restoredCount = 0;
    this.originalProperties.forEach((originalProps, entityId) => {
      Object.values(this.buildingIndoor.dataSources || {}).forEach(
        (dataSource) => {
          const entity = dataSource.entities.getById(entityId);
          if (entity) {
            try {
              // Restore show property
              entity.show = originalProps.show;

              // Restore position
              if (originalProps.position) {
                entity.position = originalProps.position;
              }

              // Restore billboard properties
              if (originalProps.billboard && entity.billboard) {
                Object.keys(originalProps.billboard).forEach((key) => {
                  if (originalProps.billboard[key] !== undefined) {
                    entity.billboard[key] = originalProps.billboard[key];
                  }
                });
              }

              // Restore polygon properties
              if (originalProps.polygon && entity.polygon) {
                Object.keys(originalProps.polygon).forEach((key) => {
                  if (originalProps.polygon[key] !== undefined) {
                    entity.polygon[key] = originalProps.polygon[key];
                  }
                });
              }

              // Restore polyline properties
              if (originalProps.polyline && entity.polyline) {
                Object.keys(originalProps.polyline).forEach((key) => {
                  if (originalProps.polyline[key] !== undefined) {
                    entity.polyline[key] = originalProps.polyline[key];
                  }
                });
              }

              restoredCount++;
            } catch (error) {
              console.warn(
                `[2DLayeringManager] Error restoring entity ${entityId}:`,
                error
              );
            }
          }
        }
      );
    });

    console.log(
      `[2DLayeringManager] ✅ Restored ${restoredCount} entity properties`
    );
  }
}
