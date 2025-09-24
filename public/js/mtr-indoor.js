/**
 * MTRIndoor Module - 3D MTR Station Indoor Visualization for CesiumJS
 *
 * This module provides comprehensive functionality for displaying Hong Kong MTR
 * station indoor data in a 3D Cesium environment. It handles MTR venue polygons,
 * floor navigation, unit categorization with color coding, amenity points, and
 * occupant information specifically designed for MTR stations.
 *
 * Features:
 * - Multi-floor MTR station visualization
 * - MTR-specific color-coded unit categories (platform, ticketing, paidarea, etc.)
 * - Interactive floor selection with cumulative floor display
 * - MTR amenity point icons (faregate, platform, ATM, etc.)
 * - 3D corridor and opening visualization with turnstile support
 * - Occupant label display with enhanced styling
 * - MTR station-specific camera navigation
 *
 * Data Sources:
 * - Hong Kong Map Service WFS APIs for MTR indoor venue data
 * - GeoJSON format with MTR-specific property attributes
 * - Real-time fetching and processing of MTR station information
 *
 * @module MTRIndoor
 * @version 1.0.0
 * @author Generated from demo.html
 */

/**
 * MTRIndoor class for managing 3D MTR station indoor visualization
 *
 * This class handles the complete lifecycle of MTR station indoor display including
 * data fetching, 3D entity creation, floor navigation, and user interface
 * components specifically designed for Hong Kong MTR stations.
 *
 * @class MTRIndoor
 * @example
 * ```javascript
 * import { MTRIndoor } from './mtr-indoor.js';
 *
 * const mtrIndoor = new MTRIndoor(cesiumViewer, 'MTR_STATION_ID');
 * await mtrIndoor.init();
 * await mtrIndoor.showAllFloor();
 * mtrIndoor.initVenueOption('#mtr-controls');
 * await mtrIndoor.flyTo();
 * ```
 */
export class MTRIndoor {
  /**
   * API version for tracking compatibility
   * @private
   * @type {string}
   */
  #version = "v1.2.0";

  /**
   * API key for Hong Kong Map Service (currently empty)
   * @private
   * @type {string}
   */
  #apikey = "";

  /**
   * Hong Kong Map Service WFS API endpoints for MTR indoor venue data
   * @private
   * @type {Object.<string, string>}
   */
  #indoorAPIs = {
    mtr_venue_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_venue_polygon",
    mtr_level_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_level_polygon",
    mtr_unit_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_unit_polygon",
    mtr_opening_line:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_opening_line",
    mtr_amenity_point:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_amenity_point",
    mtr_occupant_point:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/mtr_occupant_point",
  };

  /**
   * Unique identifier for this MTR station instance
   * @private
   * @type {string}
   */
  #uniqueId = Math.random().toString(16).slice(2);

  /**
   * Container ID for MTR station UI controls
   * @private
   * @type {string}
   */
  #venueContainerId;

  /**
   * Cesium viewer instance for 3D visualization
   * @private
   * @type {Cesium.Viewer}
   */
  #cesiumViewer = undefined;

  /**
   * MTR station venue identifier for data queries
   * @private
   * @type {string}
   */
  #venueId = "";

  /**
   * WFS query parameters for API requests
   * @private
   * @type {string}
   */
  #queryParam = "";

  /**
   * Cached GeoJSON data for all MTR station features
   * @private
   * @type {Object.<string, Object>}
   */
  #geoJson = {};

  /**
   * Cesium GeoJsonDataSource instances for each feature category
   * @private
   * @type {Object.<string, Cesium.GeoJsonDataSource>}
   */
  #geoJsonDataSource = {};

  /**
   * Custom data sources for specialized 3D entities (Opening, Amenity, Occupant)
   * @private
   * @type {Object.<string, Cesium.CustomDataSource>}
   */
  #customDataSource = {};

  /**
   * Flag to determine if using local data or API data
   * @private
   * @type {boolean}
   */
  #useLocalData = false;

  /**
   * Local data file paths for offline/local data usage
   * @private
   * @type {Object.<string, string>}
   */
  #localDataPaths = {};

  /**
   * Comprehensive styling configuration for all MTR station features
   * Includes colors, materials, and display properties for different
   * unit categories, amenities, and architectural elements specific to MTR stations
   * @private
   * @type {Object}
   */
  #styles = {
    mtr_venue_polygon: {
      stroke: new Cesium.Color(0, 0, 0, 0),
      fill: new Cesium.Color(0.82, 0.75, 0.99, 1),
      outline: false,
    },
    mtr_level_polygon: {
      stroke: new Cesium.Color(0, 0, 0, 0),
      fill: new Cesium.Color(0.96, 0.72, 0.99, 1),
      outline: false,
    },
    mtr_unit_polygon: {
      // Educational and meeting spaces
      auditorium: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.51, 0.51, 0.51, 1),
        outline: false,
      },
      classroom: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.98, 0.83, 0.87, 1),
        outline: false,
      },
      conferenceroom: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 0.75, 1),
        outline: false,
      },
      library: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 0.75, 1),
        outline: false,
      },

      // Vertical transportation
      elevator: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.75, 1, 0.91, 1),
        outline: false,
      },
      escalator: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.75, 1, 0.91, 1),
        outline: false,
      },
      stairs: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.75, 1, 0.91, 1),
        outline: false,
      },
      steps: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.75, 1, 0.91, 1),
        outline: false,
      },
      ramp: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 0.83, 0.5, 1),
        outline: false,
      },

      // Recreation and entertainment
      fieldofplay: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.74, 1, 0.73, 1),
        outline: false,
      },
      theater: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.99, 0.71, 0.96, 1),
        outline: false,
      },

      // Food and service areas
      foodservice: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 0.75, 1),
        outline: false,
      },

      // Specialized facilities
      laboratory: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },

      // Public spaces
      lobby: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 0.83, 0.5, 1),
        outline: false,
      },
      walkway: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 0.83, 0.5, 1),
        outline: false,
      },

      // Family and accessibility facilities
      mothersroom: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.71, 0.97, 1, 1),
        outline: false,
      },

      // Administrative and private areas
      nonpublic: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.61, 0.61, 0.61, 1),
        outline: false,
      },
      office: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.51, 0.51, 0.51, 1),
        outline: false,
      },
      storage: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.51, 0.51, 0.51, 1),
        outline: false,
      },

      // Special architectural features
      opentobelow: {
        stroke: new Cesium.Color(0, 0, 0, 0),
        fill: new Cesium.Color(1, 1, 1, 0),
        outline: false,
      },

      // Transportation and parking
      parking: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.71, 0.7, 1, 1),
        outline: false,
      },
      platform: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.88, 0.88, 0.88, 1),
        outline: false,
      },
      road: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.99, 0.92, 0.7, 1),
        outline: false,
      },

      // Restroom facilities (color-coded for easy identification)
      restroom: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },
      "restroom.family": {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },
      "restroom.female": {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },
      "restroom.male": {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },
      "restroom.unisex": {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },
      "restroom.wheelchair": {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 0.75, 1, 1),
        outline: false,
      },

      // General spaces
      room: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 0.75, 1),
        outline: false,
      },
      terrace: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.51, 0.51, 0.51, 1),
        outline: false,
      },
      unenclosedarea: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.69, 0.99, 0.71, 1),
        outline: false,
      },
      vegetation: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.91, 1, 0.75, 1),
        outline: false,
      },
      unspecified: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 1, 1),
        outline: false,
      },

      // MTR-specific areas with distinctive colors
      paidarea: {
        stroke: new Cesium.Color(0, 0, 0, 1),
        fill: new Cesium.Color(0.57, 0.73, 0.91, 1),
        outline: false,
      },
      ticketing: {
        stroke: new Cesium.Color(0, 0, 0, 1),
        fill: new Cesium.Color(0.95, 0.91, 0.54, 1),
        outline: false,
      },
    },
    mtr_opening_line: {
      // MTR-specific opening types with distinctive colors
      turnstile: new Cesium.Color(1, 0, 0, 1),
      "turnstile.fullheight": new Cesium.Color(1, 0, 0, 1),
      "turnstile.waistheight": new Cesium.Color(1, 0, 0, 1),
      sliding: new Cesium.Color(0, 0.35, 0.57, 1),
      open: new Cesium.Color(1, 1, 1, 0.05),
      default: new Cesium.Color(0.48, 0.89, 0.78, 0.23),
    },
    mtr_amenity_point: {
      // Financial services
      atm: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/atm.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      bank: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/bank.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Transportation amenities
      busstop: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/busstop.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      escalator: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/escalator.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      elevator: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/elevator.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      stairs: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/stairs.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      movingwalkway: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/movingwalkway.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // MTR-specific transportation
      faregate: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/faregate.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      platform: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/platform.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      trainstation: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/trainstation.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "rail.muni": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/rail.muni.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Restroom amenities
      "restroom.female": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/restroom.female.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "restroom.male": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/restroom.male.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "restroom.unisex": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/restroom.unisex.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "restroom.wheelchair": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/restroom.wheelchair.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Service amenities
      information: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/information.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      security: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/security.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      vendingmachine: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/vendingmachine.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Commercial amenities
      shopping: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/shopping.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      restaurant: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/restaurant.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      conveniencestore: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/conveniencestore.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Default and others
      entry: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/entry.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      unspecified: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/unspecified.png",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 5,
        height: 5,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
    },
    mtr_occupant_point: {
      font: "Arial",
      eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
      fillColor: Cesium.Color.BLACK,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 5,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    },
  };

  /**
   * Creates a new MTRIndoor instance
   *
   * @param {Cesium.Viewer} cesiumViewer - The Cesium viewer instance for 3D display
   * @param {string|Object} venueIdOrConfig - Either venue ID string for API mode, or config object for local mode
   * @param {Object} [localDataPaths] - Optional local data paths for local mode
   *
   * @example
   * ```javascript
   * // API mode - uses Hong Kong Map Service APIs
   * const mtrIndoor = new MTRIndoor(viewer, 'HK_MTR_TSY_001');
   *
   * // Local mode - uses local GeoJSON files
   * const localPaths = {
   *   mtr_venue_polygon: './data/Tsing Yi Station/mtr_venue.geojson',
   *   mtr_level_polygon: './data/Tsing Yi Station/mtr_level.geojson',
   *   mtr_unit_polygon: './data/Tsing Yi Station/mtr_unit.geojson',
   *   mtr_opening_line: './data/Tsing Yi Station/mtr_opening.geojson',
   *   mtr_amenity_point: './data/Tsing Yi Station/mtr_amenity_1.geojson',
   *   mtr_occupant_point: './data/Tsing Yi Station/mtr_occupant.geojson'
   * };
   * const mtrIndoor = new MTRIndoor(viewer, 'tsing-yi-station', localPaths);
   * ```
   */
  constructor(cesiumViewer, venueIdOrConfig, localDataPaths = null) {
    this.#cesiumViewer = cesiumViewer;

    if (localDataPaths) {
      // Local data mode - load from local GeoJSON files
      this.#useLocalData = true;
      this.#venueId = venueIdOrConfig;
      this.#localDataPaths = localDataPaths;
      this.#queryParam = ""; // Not needed for local data
    } else {
      // API mode - fetch from Hong Kong Map Service
      this.#useLocalData = false;
      if (typeof venueIdOrConfig === "object") {
        this.#venueId = venueIdOrConfig;
        this.#queryParam = `?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application%2Fjson&srsname=EPSG:4326&count=5000&cql_filter=venue_id%3D'${venueIdOrConfig}'`;
      } else {
        this.#venueId = venueIdOrConfig || "";
        this.#queryParam = `?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application%2Fjson&srsname=EPSG:4326&count=5000&cql_filter=venue_id%3D'${venueIdOrConfig}'`;
      }
    }
  }

  /**
   * Initializes the MTR station by fetching data and preparing data sources
   *
   * This method performs different operations based on the data source mode:
   * - API mode: Fetches data from Hong Kong Map Service MTR APIs
   * - Local mode: Loads data from local GeoJSON files
   *
   * Both modes:
   * 1. Creates GeoJsonDataSource instances for each feature category
   * 2. Processes and caches the returned GeoJSON data
   * 3. Adds data sources to the Cesium viewer
   * 4. Creates custom data sources for specialized entities
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * // API mode
   * await mtrIndoor.init();
   *
   * // Local mode
   * await mtrIndoor.init();
   * console.log('MTR station data loaded and ready for display');
   * ```
   */
  async init() {
    // Initialize data sources for each feature category
    const dataSourceKeys = this.#useLocalData
      ? Object.keys(this.#localDataPaths)
      : Object.keys(this.#indoorAPIs);

    dataSourceKeys.forEach((featureCategory) => {
      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        // Categories with subcategories need nested data sources
        this.#geoJsonDataSource[featureCategory] = {};
        Object.keys(this.#styles[featureCategory]).forEach((dataCategory) => {
          this.#geoJsonDataSource[featureCategory][dataCategory] =
            new Cesium.GeoJsonDataSource(
              `${this.#uniqueId}_${featureCategory}_${dataCategory}`
            );
        });
      } else {
        // Simple categories get single data sources
        this.#geoJsonDataSource[featureCategory] = new Cesium.GeoJsonDataSource(
          `${this.#uniqueId}_${featureCategory}`
        );
      }
    });

    // Fetch data based on mode (API or local)
    let results, values;
    if (this.#useLocalData) {
      // Local mode: fetch from local files
      results = await Promise.all(
        dataSourceKeys.map((key) => fetch(this.#localDataPaths[key]))
      );
    } else {
      // API mode: fetch from Hong Kong Map Service
      results = await Promise.all(
        dataSourceKeys.map((key) =>
          fetch(`${this.#indoorAPIs[key]}${this.#queryParam}`)
        )
      );
    }

    values = await Promise.all(results.map((p) => p.json()));

    // Cache the fetched GeoJSON data
    let i = 0;
    dataSourceKeys.forEach((featureCategory) => {
      this.#geoJson[featureCategory] = values[i++];

      // Add data sources to viewer
      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        Object.keys(this.#styles[featureCategory]).forEach((dataCategory) => {
          this.#cesiumViewer.dataSources.add(
            this.#geoJsonDataSource[featureCategory][dataCategory]
          );
        });
      } else {
        this.#cesiumViewer.dataSources.add(
          this.#geoJsonDataSource[featureCategory]
        );
      }
    });

    // Create custom data sources for specialized 3D entities
    this.#customDataSource = {
      Opening: new Cesium.CustomDataSource("Opening"),
      Amenity: new Cesium.CustomDataSource("Amenity"),
      Occupant: new Cesium.CustomDataSource("Occupant"),
    };

    // Add custom data sources to viewer
    Object.values(this.#customDataSource).forEach((dsCustom) => {
      this.#cesiumViewer.dataSources.add(dsCustom);
    });
  }

  /**
   * Displays all floors of the MTR station simultaneously
   *
   * This method clears existing custom entities and renders all MTR station data
   * without any floor filtering, providing a complete view of the entire
   * station structure across all levels.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await mtrIndoor.showAllFloor();
   * // All floors of the MTR station are now visible
   * ```
   */
  async showAllFloor() {
    // Clear existing custom entities
    Object.values(this.#customDataSource).forEach((dsCustom) => {
      dsCustom.entities.removeAll();
    });

    // Render all categories without floor filtering
    const dataSourceKeys = this.#useLocalData
      ? Object.keys(this.#localDataPaths)
      : Object.keys(this.#indoorAPIs);
    dataSourceKeys.forEach((cate) => {
      this.showByCategory(cate, this.#geoJson[cate]);
    });
  }

  /**
   * Displays a specific floor of the MTR station
   *
   * This method filters the MTR station data to show only features
   * belonging to the specified floor level.
   *
   * @async
   * @param {string} floor - The floor identifier (e.g., 'G', '1', 'B1', 'L1')
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await mtrIndoor.showFloor('G');   // Show ground floor
   * await mtrIndoor.showFloor('L1');  // Show Level 1
   * await mtrIndoor.showFloor('B1');  // Show basement level 1
   * ```
   */
  async showFloor(floor) {
    // Clear existing custom entities
    Object.values(this.#customDataSource).forEach((dsCustom) => {
      dsCustom.entities.removeAll();
    });

    // Filter and render data for specific floor
    const dataSourceKeys = this.#useLocalData
      ? Object.keys(this.#localDataPaths)
      : Object.keys(this.#indoorAPIs);
    dataSourceKeys.forEach((cate) => {
      const clone = structuredClone(this.#geoJson[cate]);
      clone.features = clone.features.filter(
        (f) => f.properties.level_short_name_en == floor
      );
      this.showByCategory(cate, clone);
    });
  }

  /**
   * Displays the specified floor and all floors below it
   *
   * This method provides a cumulative view showing the target floor
   * plus all lower floors, useful for understanding the vertical
   * structure and connections between MTR station levels.
   *
   * @async
   * @param {number|string} ordinal - The ordinal value of the highest floor to display
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await mtrIndoor.showFloorWithLower(2);
   * // Shows floors with ordinal <= 2 (e.g., B2, B1, G, L1, L2)
   * ```
   */
  async showFloorWithLower(ordinal) {
    // Clear existing custom entities
    Object.values(this.#customDataSource).forEach((dsCustom) => {
      dsCustom.entities.removeAll();
    });

    // Filter and render data for floors at or below the specified ordinal
    const dataSourceKeys = this.#useLocalData
      ? Object.keys(this.#localDataPaths)
      : Object.keys(this.#indoorAPIs);
    dataSourceKeys.forEach((cate) => {
      const clone = structuredClone(this.#geoJson[cate]);
      clone.features = clone.features.filter(
        (f) => parseInt(f.properties.level_ordinal) <= parseInt(ordinal)
      );
      this.showByCategory(cate, clone);
    });
  }

  /**
   * Renders MTR station features by category with appropriate 3D styling
   *
   * This is the core rendering method that handles different MTR feature types:
   * - MTR unit polygons: 3D extruded areas with special handling for paidarea/ticketing
   * - MTR opening lines: Doors and openings with turnstile support
   * - MTR amenity points: Icon billboards for MTR facilities
   * - MTR occupant points: Text labels with enhanced styling
   *
   * @async
   * @param {string} featureCategory - The category of features to render
   * @param {Object} geojson - The GeoJSON data to process
   * @returns {Promise<void>}
   *
   * @private
   */
  async showByCategory(featureCategory, geojson) {
    switch (featureCategory) {
      case "mtr_venue_polygon":
      case "mtr_level_polygon":
        // These are handled by other categories or external venue rendering
        break;

      case "mtr_opening_line":
        // Create 3D door and opening representations with MTR-specific types
        await this.#geoJsonDataSource[featureCategory].load(
          geojson,
          this.#styles[featureCategory]
        );
        this.#geoJsonDataSource[featureCategory].show = false;

        for (const entity of this.#geoJsonDataSource[featureCategory].entities
          .values) {
          if (
            !entity.properties.opening_display_height._value ||
            (parseFloat(entity.properties.opening_display_height) == 0 &&
              entity.properties.opening_door_type != "sliding")
          )
            continue;

          const baseHeight = parseFloat(entity.properties.level_z_value);
          const doorType =
            entity.properties.opening_door_type["_value"] ||
            entity.properties.opening_door_type;
          const materialKey = Object.keys(
            this.#styles[featureCategory]
          ).includes(doorType)
            ? doorType
            : "default";

          const corr = {
            id: `${featureCategory}.${Math.random().toString(16).slice(2)}`,
            name: doorType,
            corridor: {
              positions: entity.polyline.positions,
              height: baseHeight,
              extrudedHeight:
                baseHeight +
                Math.max(
                  0,
                  -0.01 +
                    (doorType == "sliding"
                      ? 0.05
                      : parseFloat(entity.properties.opening_display_height))
                ),
              width: 0.12,
              material: this.#styles[featureCategory][materialKey],
              outline: false,
              cornerType: Cesium.CornerType.MITERED,
            },
            properties: entity.properties,
          };
          this.#customDataSource.Opening.entities.add(corr);
        }
        break;

      case "mtr_unit_polygon":
        // Render 3D extruded unit areas with MTR-specific categorization
        Object.keys(this.#styles[featureCategory]).forEach(
          async (dataCategory) => {
            const clone = structuredClone(geojson);

            // Special handling for MTR-specific categories
            if (dataCategory == "paidarea" || dataCategory == "ticketing") {
              clone.features = clone.features.filter(
                (f) =>
                  f.properties.section_category &&
                  f.properties.section_category.toLowerCase() == dataCategory
              );
            } else {
              clone.features = clone.features.filter(
                (f) =>
                  f.properties.unit_category == dataCategory &&
                  (!f.properties.section_category ||
                    (f.properties.section_category.toLowerCase() !=
                      "paidarea" &&
                      f.properties.section_category.toLowerCase() !=
                        "ticketing"))
              );
            }

            await this.#geoJsonDataSource[featureCategory][dataCategory].load(
              clone,
              this.#styles[featureCategory][dataCategory]
            );

            // Apply 3D properties to each unit polygon
            Object.values(
              this.#geoJsonDataSource[featureCategory][dataCategory].entities
                .values
            ).forEach((entity) => {
              // Set entity name based on occupant or unit name
              if (
                entity.properties.occupant_name_en._value == null ||
                entity.properties.occupant_name_en._value == "null"
              ) {
                entity.name = entity.properties.unit_name_en;
              } else {
                entity.name = entity.properties.occupant_name_en;
              }

              // Apply 3D extrusion properties
              entity.polygon.arcType = Cesium.ArcType.GEODESIC;
              entity.polygon.height = parseFloat(
                entity.properties.level_z_value
              );
              entity.polygon.extrudedHeight =
                parseFloat(entity.properties.level_z_value) +
                parseFloat(entity.properties.unit_display_thickness);
            });
          }
        );
        break;

      case "mtr_amenity_point":
        // Render MTR amenity icons by category
        const dsAmenity = this.#customDataSource.Amenity;

        Object.keys(this.#styles[featureCategory]).forEach(
          async (dataCategory) => {
            const clone = structuredClone(geojson);
            clone.features = geojson.features.filter(
              (f) => f.properties.amenity_category == dataCategory
            );
            await this.#geoJsonDataSource[featureCategory][dataCategory].load(
              clone
            );
            this.#geoJsonDataSource[featureCategory][dataCategory].show = false;

            for (const entity of this.#geoJsonDataSource[featureCategory][
              dataCategory
            ].entities.values) {
              const amenityPoint = {
                id: `${featureCategory}.${Math.random().toString(16).slice(2)}`,
                name: entity.properties.amenity_name_en,
                position: entity.position,
                billboard: this.#styles[featureCategory][dataCategory],
                properties: entity.properties,
              };
              dsAmenity.entities.add(amenityPoint);

              // Special handling for platform and entry amenities with labels
              if (
                entity.properties["amenity_category"] == "platform" ||
                entity.properties["amenity_category"] == "entry"
              ) {
                const lblStyle = structuredClone(
                  this.#styles["mtr_occupant_point"]
                );
                lblStyle.pixelOffset = new Cesium.Cartesian2(0, -28);
                lblStyle.text = entity.properties["amenity_name_en"];
                lblStyle.distanceDisplayCondition =
                  new Cesium.DistanceDisplayCondition(0, 350);

                const amenityPoint_lbl = {
                  id: `${featureCategory}.${Math.random()
                    .toString(16)
                    .slice(2)}`,
                  name: entity.properties.amenity_name_en,
                  position: entity.position,
                  label: lblStyle,
                  properties: entity.properties,
                };
                dsAmenity.entities.add(amenityPoint_lbl);
              }
            }
          }
        );
        break;

      case "mtr_occupant_point":
        // Render occupant name labels with enhanced styling
        const dsOccupant = this.#customDataSource.Occupant;
        await this.#geoJsonDataSource[featureCategory].load(
          geojson,
          this.#styles[featureCategory]
        );
        this.#geoJsonDataSource[featureCategory].show = false;

        for (const entity of this.#geoJsonDataSource[featureCategory].entities
          .values) {
          const lblStyle = structuredClone(this.#styles[featureCategory]);
          lblStyle.text = entity.properties["occupant_name_en"];
          lblStyle.distanceDisplayCondition =
            new Cesium.DistanceDisplayCondition(0, 350);

          const lbl = {
            id: `${featureCategory}.${Math.random().toString(16).slice(2)}`,
            name: entity.properties.occupant_name_en,
            position: entity.position,
            label: lblStyle,
            properties: entity.properties,
          };
          dsOccupant.entities.add(lbl);
        }
        break;

      default:
        // Standard GeoJSON loading for other categories
        this.#geoJsonDataSource[featureCategory].load(
          geojson,
          this.#styles[featureCategory]
        );
    }
  }

  /**
   * Removes all floor displays and clears entities
   *
   * This method provides a clean slate by removing all rendered
   * MTR station features while keeping the data sources intact.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * mtrIndoor.removeAllFloor();
   * // All MTR station visualization cleared
   * ```
   */
  removeAllFloor() {
    // Clear custom entities
    Object.values(this.#customDataSource).forEach((dsCustom) => {
      dsCustom.entities.removeAll();
    });

    // Clear GeoJSON data sources
    const dataSourceKeys = this.#useLocalData
      ? Object.keys(this.#localDataPaths)
      : Object.keys(this.#indoorAPIs);
    dataSourceKeys.forEach((featureCategory) => {
      const clone = structuredClone(this.#geoJson[featureCategory]);
      clone.features = [];

      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        Object.keys(this.#styles[featureCategory]).forEach((unitCate) => {
          this.#geoJsonDataSource[featureCategory][unitCate].load(
            clone,
            this.#styles[featureCategory][unitCate]
          );
        });
      } else {
        this.#geoJsonDataSource[featureCategory].load(
          clone,
          this.#styles[featureCategory]
        );
      }
    });
  }

  /**
   * Creates interactive MTR station controls for floor selection
   *
   * This method generates a complete UI interface including:
   * - MTR station information display with name
   * - Floor selection buttons with proper ordering
   * - "With lower floor" toggle for cumulative display
   * - Automatic event handling for user interactions
   *
   * The interface is inserted into the specified container element
   * and provides full floor navigation capabilities for MTR stations.
   *
   * @param {string} containerId - CSS selector for the container element
   * @returns {void}
   *
   * @example
   * ```javascript
   * mtrIndoor.initVenueOption('#mtr-controls');
   * // Creates interactive MTR station floor selection UI
   * ```
   */
  initVenueOption(containerId) {
    const floorSelectId = `floor-selection`;
    const toggleLowerId = `floor-mode-toggle`;
    this.#venueContainerId = containerId;
    const container = document.querySelector(containerId);

    // Create MTR station information and toggle controls
    let tempHtml = `<table class="infoPanel">
            <thead><tr><th colspan=2>${
              this.#geoJson["mtr_venue_polygon"].features[0].properties
                .venue_name_en
            }</th></tr></thead>
            <tbody>
                <tr><td><label for="${toggleLowerId}" style="cursor:pointer">With lower floor</label></td><td><input type="checkbox" id="${toggleLowerId}" /></td></tr>
            </tbody></table>`;

    // Create floor selection container
    tempHtml += `<div id="${floorSelectId}" class="infoPanel"><div data-floor="All" data-value="All" selected class="active">All</div></div>`;
    container.innerHTML = tempHtml;

    const floorSelect = document.querySelector(`#${floorSelectId}`);
    const toggleLower = document.querySelector(`#${toggleLowerId}`);

    // Process floor data and create selection options
    const levelList = this.#geoJson["mtr_level_polygon"].features;
    const lvDict = {};

    // Build floor dictionary with ordinal ranges
    levelList.forEach((floor) => {
      if (!lvDict[floor.properties.level_short_name_en]) {
        lvDict[floor.properties.level_short_name_en] = { min: 999, max: -999 };
      }
      lvDict[floor.properties.level_short_name_en] = {
        min: Math.min(
          lvDict[floor.properties.level_short_name_en].min,
          parseInt(floor.properties.level_ordinal)
        ),
        max: Math.max(
          lvDict[floor.properties.level_short_name_en].max,
          parseInt(floor.properties.level_ordinal)
        ),
      };
    });

    // Sort floors by ordinal (highest first)
    const lvDisplay = Object.entries(lvDict);
    lvDisplay.sort((a, b) => {
      return b[1].min - a[1].min;
    });

    // Create floor selection buttons
    lvDisplay.forEach((floor) => {
      const floorDis = floor[0];
      const floorOrdMin = floor[1].min;
      const floorOrdMax = floor[1].max;
      const opt = document.createElement("div");
      opt.dataset.floor = floorDis;
      opt.innerHTML = floorDis;
      opt.dataset.ordinalMin = floorOrdMin;
      opt.dataset.ordinalMax = floorOrdMax;
      floorSelect.appendChild(opt);
    });

    // Floor update handler
    const updateFloor = async (floor, ordinal, withLower) => {
      floor == "All"
        ? this.showAllFloor()
        : withLower
        ? this.showFloorWithLower(ordinal)
        : this.showFloor(floor);
    };

    // Add click handlers for floor selection
    document.querySelectorAll(`#${floorSelectId} > div`).forEach((ele) => {
      ele.addEventListener("click", async (event) => {
        document
          .querySelectorAll(`#${floorSelectId} > div.active`)
          .forEach((e) => e.classList.remove("active"));
        ele.classList.add("active");
        updateFloor(
          event.target.dataset.floor,
          event.target.dataset.ordinalMax,
          toggleLower.checked
        );
      });
    });

    // Add change handler for lower floor toggle
    toggleLower.addEventListener("change", async (event) => {
      const selected = document.querySelectorAll(
        `#${floorSelectId} > div.active`
      )[0];
      updateFloor(
        selected.dataset.floor,
        selected.dataset.ordinalMax,
        event.target.checked
      );
    });
  }

  /**
   * Removes the MTR station control interface
   *
   * This method cleans up the UI by clearing the container
   * that holds the MTR station controls.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await mtrIndoor.deleteVenueOption();
   * // UI controls removed
   * ```
   */
  async deleteVenueOption() {
    document.querySelector(this.#venueContainerId).innerHTML = "";
  }

  /**
   * Applies Z-value clipping to all MTR station entities
   *
   * This method controls the visibility of MTR station entities based on their
   * Z-coordinates. For 3D extruded features (corridors, openings), it
   * shows them if their base Z-value is below the clipping threshold.
   *
   * @param {number} maxZ - Maximum Z-value in meters. Entities above this value will be hidden
   * @returns {void}
   *
   * @example
   * ```javascript
   * mtrIndoor.applyZClipping(20.0);
   * // Shows all features with Z-values <= 20.0 meters
   * ```
   */
  applyZClipping(maxZ) {
    // Iterate through all entities in the viewer
    this.#cesiumViewer.entities.values.forEach((entity) => {
      // Check if this entity belongs to this MTR station instance
      if (!entity.id || !entity.id.includes(this.#uniqueId)) {
        return;
      }

      // Get the entity's Z-value from properties
      let entityZ = null;

      if (entity.properties && entity.properties.level_z_value) {
        entityZ = parseFloat(
          entity.properties.level_z_value._value ||
            entity.properties.level_z_value
        );
      }

      // If no Z-value found, keep entity visible
      if (entityZ === null || isNaN(entityZ)) {
        entity.show = true;
        return;
      }

      // Apply clipping: show if entity's Z-value is <= maxZ
      entity.show = entityZ <= maxZ;
    });

    // Handle data source entities (GeoJSON features)
    Object.keys(this.#geoJsonDataSource).forEach((featureCategory) => {
      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        // Handle categorized data sources
        Object.keys(this.#geoJsonDataSource[featureCategory]).forEach(
          (subCategory) => {
            const dataSource =
              this.#geoJsonDataSource[featureCategory][subCategory];
            if (dataSource && dataSource.entities) {
              dataSource.entities.values.forEach((entity) => {
                let entityZ = null;

                if (entity.properties && entity.properties.level_z_value) {
                  entityZ = parseFloat(
                    entity.properties.level_z_value._value ||
                      entity.properties.level_z_value
                  );
                }

                if (entityZ !== null && !isNaN(entityZ)) {
                  entity.show = entityZ <= maxZ;
                }
              });
            }
          }
        );
      } else {
        // Handle simple data sources
        const dataSource = this.#geoJsonDataSource[featureCategory];
        if (dataSource && dataSource.entities) {
          dataSource.entities.values.forEach((entity) => {
            let entityZ = null;

            if (entity.properties && entity.properties.level_z_value) {
              entityZ = parseFloat(
                entity.properties.level_z_value._value ||
                  entity.properties.level_z_value
              );
            }

            if (entityZ !== null && !isNaN(entityZ)) {
              entity.show = entityZ <= maxZ;
            }
          });
        }
      }
    });
  }

  /**
   * Resets Z-clipping to show all MTR station entities
   *
   * This method restores the visibility of all MTR station entities,
   * effectively removing any Z-value clipping constraints.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * mtrIndoor.resetZClipping();
   * // All MTR station entities are now visible regardless of Z-value
   * ```
   */
  resetZClipping() {
    // Reset all MTR station entities to visible
    this.#cesiumViewer.entities.values.forEach((entity) => {
      if (entity.id && entity.id.includes(this.#uniqueId)) {
        entity.show = true;
      }
    });

    // Reset data source entities
    Object.keys(this.#geoJsonDataSource).forEach((featureCategory) => {
      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        Object.keys(this.#geoJsonDataSource[featureCategory]).forEach(
          (subCategory) => {
            const dataSource =
              this.#geoJsonDataSource[featureCategory][subCategory];
            if (dataSource && dataSource.entities) {
              dataSource.entities.values.forEach((entity) => {
                entity.show = true;
              });
            }
          }
        );
      } else {
        const dataSource = this.#geoJsonDataSource[featureCategory];
        if (dataSource && dataSource.entities) {
          dataSource.entities.values.forEach((entity) => {
            entity.show = true;
          });
        }
      }
    });
  }

  /**
   * Gets the Z-value range of this MTR station
   *
   * This method analyzes all MTR station entities to determine the minimum
   * and maximum Z-values, which can be used for clipping range calculation.
   *
   * @returns {Object} Object with min and max Z-values: {min: number, max: number}
   *
   * @example
   * ```javascript
   * const zRange = mtrIndoor.getZRange();
   * console.log(`MTR Station Z-range: ${zRange.min}m to ${zRange.max}m`);
   * ```
   */
  getZRange() {
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Check all MTR station entities
    this.#cesiumViewer.entities.values.forEach((entity) => {
      if (
        entity.id &&
        entity.id.includes(this.#uniqueId) &&
        entity.properties &&
        entity.properties.level_z_value
      ) {
        const entityZ = parseFloat(
          entity.properties.level_z_value._value ||
            entity.properties.level_z_value
        );
        if (!isNaN(entityZ)) {
          minZ = Math.min(minZ, entityZ);
          maxZ = Math.max(maxZ, entityZ);
        }
      }
    });

    // Check data source entities
    Object.keys(this.#geoJsonDataSource).forEach((featureCategory) => {
      if (["mtr_unit_polygon", "mtr_amenity_point"].includes(featureCategory)) {
        Object.keys(this.#geoJsonDataSource[featureCategory]).forEach(
          (subCategory) => {
            const dataSource =
              this.#geoJsonDataSource[featureCategory][subCategory];
            if (dataSource && dataSource.entities) {
              dataSource.entities.values.forEach((entity) => {
                if (entity.properties && entity.properties.level_z_value) {
                  const entityZ = parseFloat(
                    entity.properties.level_z_value._value ||
                      entity.properties.level_z_value
                  );
                  if (!isNaN(entityZ)) {
                    minZ = Math.min(minZ, entityZ);
                    maxZ = Math.max(maxZ, entityZ);
                  }
                }
              });
            }
          }
        );
      } else {
        const dataSource = this.#geoJsonDataSource[featureCategory];
        if (dataSource && dataSource.entities) {
          dataSource.entities.values.forEach((entity) => {
            if (entity.properties && entity.properties.level_z_value) {
              const entityZ = parseFloat(
                entity.properties.level_z_value._value ||
                  entity.properties.level_z_value
              );
              if (!isNaN(entityZ)) {
                minZ = Math.min(minZ, entityZ);
                maxZ = Math.max(maxZ, entityZ);
              }
            }
          });
        }
      }
    });

    return {
      min: minZ === Infinity ? 0 : minZ,
      max: maxZ === -Infinity ? 0 : maxZ,
    };
  }

  /**
   * Flies the camera to show the MTR station with optimal viewing angle
   *
   * This method calculates the optimal camera position for MTR stations by:
   * 1. Finding the paid area extent (core operational area)
   * 2. Computing 3D bounding volume including vertical extent
   * 3. Applying MTR-specific camera angles for best station overview
   * 4. Setting appropriate distance based on station size
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await mtrIndoor.flyTo();
   * // Camera positioned for optimal MTR station view
   * ```
   */
  async flyTo() {
    // Find paid area units (core operational area of MTR station)
    const paidareaUnits = this.#geoJson["mtr_unit_polygon"].features.filter(
      (unit) => unit.properties.section_category?.toLowerCase() == "paidarea"
    );

    if (paidareaUnits.length === 0) {
      // Fallback to venue polygon if no paid area found
      if (this.#geoJson["mtr_venue_polygon"]?.features?.length > 0) {
        const venue = this.#geoJson["mtr_venue_polygon"].features[0];
        const bbox = venue.properties.bbox;
        const venueHeight =
          parseFloat(venue.properties.venue_display_height) || 20;
        const center = Cesium.Cartesian3.fromDegrees(
          (bbox[0] + bbox[2]) / 2,
          (bbox[1] + bbox[3]) / 2,
          venueHeight / 2
        );
        const min = Cesium.Cartesian3.fromDegrees(bbox[0], bbox[1], 0);
        const max = Cesium.Cartesian3.fromDegrees(
          bbox[2],
          bbox[3],
          venueHeight
        );
        const minMaxDiff = Cesium.Cartesian3.distance(min, max);
        this.#cesiumViewer.camera.flyToBoundingSphere(
          new Cesium.BoundingSphere(center, minMaxDiff / 2)
        );
      }
      return;
    }

    // Calculate bounding box of paid area
    const paidarea = [1e10, 1e10, -1e10, -1e10];
    let zMin = 1e10;
    let zMax = -1e10;

    paidareaUnits.forEach((unit) => {
      const bbox = unit.properties.bbox;
      paidarea[0] = Math.min(paidarea[0], parseFloat(bbox[0]));
      paidarea[1] = Math.min(paidarea[1], parseFloat(bbox[1]));
      paidarea[2] = Math.max(paidarea[2], parseFloat(bbox[2]));
      paidarea[3] = Math.max(paidarea[3], parseFloat(bbox[3]));
      zMin = Math.min(zMin, parseFloat(unit.properties.level_z_value));
      zMax = Math.max(zMax, parseFloat(unit.properties.level_z_value));
    });

    // Calculate optimal camera position
    const center = Cesium.Cartesian3.fromDegrees(
      (paidarea[0] + paidarea[2]) / 2,
      (paidarea[1] + paidarea[3]) / 2,
      (zMin + zMax) / 2
    );
    const min3D = Cesium.Cartesian3.fromDegrees(paidarea[0], paidarea[1], zMin);
    const max3D = Cesium.Cartesian3.fromDegrees(paidarea[2], paidarea[3], zMax);
    const r = Cesium.Cartesian3.distance(max3D, min3D) / 2;

    // Calculate MTR-specific viewing angles
    const heading =
      Math.atan(9 / 16) -
      Math.atan((paidarea[3] - paidarea[1]) / (paidarea[2] - paidarea[0]));
    const pitch = -Math.atan(9 / 16);

    // Fly to optimal MTR station viewing position
    this.#cesiumViewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(center, r),
      {
        offset: {
          heading: heading,
          pitch: pitch,
          range: Math.min(2 * r, 200),
        },
      }
    );
  }

  /**
   * Completely destroys the MTR station instance and cleans up resources
   *
   * This method performs comprehensive cleanup including:
   * - Removing all rendered entities
   * - Clearing UI controls
   * - Resetting data caches
   * - Cleaning up data sources
   *
   * Use this when switching to a different MTR station or closing the application.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * mtrIndoor.destroy();
   * // All MTR station data and UI cleaned up
   * ```
   */
  destroy() {
    this.removeAllFloor();
    this.deleteVenueOption();
    this.#geoJson = {};
    this.#geoJsonDataSource = {};
    this.#customDataSource = {};
  }
}
