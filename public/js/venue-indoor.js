/**
 * VenueIndoor Module - 3D Indoor Venue Visualization for CesiumJS
 *
 * This module provides comprehensive functionality for displaying Hong Kong government
 * indoor venue data in a 3D Cesium environment. It handles venue polygons, floor
 * navigation, unit categorization with color coding, amenity points, and occupant
 * information for public indoor spaces.
 *
 * Features:
 * - Multi-floor indoor venue visualization
 * - Color-coded unit categories (restrooms, lobbies, offices, etc.)
 * - Interactive floor selection with cumulative floor display
 * - Amenity point icons (elevators, escalators, restrooms, etc.)
 * - 3D corridor and opening visualization
 * - Occupant label display
 * - Venue-specific camera navigation
 *
 * Data Sources:
 * - Hong Kong Map Service WFS APIs for indoor venue data
 * - GeoJSON format with detailed property attributes
 * - Real-time fetching and processing of venue information
 *
 * @module VenueIndoor
 * @version 1.0.0
 * @author Generated from demo.html
 */

/**
 * VenueIndoor class for managing 3D indoor venue visualization
 *
 * This class handles the complete lifecycle of indoor venue display including
 * data fetching, 3D entity creation, floor navigation, and user interface
 * components for Hong Kong government indoor venues.
 *
 * @class VenueIndoor
 * @example
 * ```javascript
 * import { VenueIndoor } from './venue-indoor.js';
 *
 * const venueIndoor = new VenueIndoor(cesiumViewer, 'VENUE_ID_123');
 * await venueIndoor.init();
 * await venueIndoor.showAllFloor();
 * venueIndoor.initVenueOption('#venue-controls');
 * await venueIndoor.flyTo();
 * ```
 */
export class VenueIndoor {
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
   * Hong Kong Map Service WFS API endpoints for indoor venue data
   * @private
   * @type {Object.<string, string>}
   */
  #indoorAPIs = {
    venue_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/venue_polygon",
    level_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/level_polygon",
    unit_polygon:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/unit_polygon",
    unit_outline:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/unit_outline",
    opening_line:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/opening_line",
    windows_line:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/windows_line",
    amenity_point:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/amenity_point",
    occupant_point:
      "https://mapapi.hkmapservice.gov.hk/ogc/wfs/indoor/occupant_point",
  };

  /**
   * Unique identifier for this venue instance
   * @private
   * @type {string}
   */
  #uniqueId = Math.random().toString(16).slice(2);

  /**
   * Container ID for venue UI controls
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
   * Venue identifier for data queries
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
   * Cached GeoJSON data for all venue features
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
   * Custom data sources for specialized 3D entities
   * @private
   * @type {Object}
   */
  #customDataSource = {};

  /**
   * Comprehensive styling configuration for all venue features
   * Includes colors, materials, and display properties for different
   * unit categories, amenities, and architectural elements
   * @private
   * @type {Object}
   */
  #styles = {
    venue_polygon: {
      stroke: new Cesium.Color(0, 0, 0, 0),
      fill: new Cesium.Color(0.82, 0.75, 0.99, 1),
      outline: false,
    },
    level_polygon: {
      stroke: new Cesium.Color(0, 0, 0, 0),
      fill: new Cesium.Color(0.96, 0.72, 0.99, 1),
      outline: false,
    },
    unit_polygon: {
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

      // Default and unspecified
      unspecified: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(1, 1, 1, 1),
        outline: false,
      },
      default: {
        stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
        fill: new Cesium.Color(0.5, 0.5, 0.5, 1),
        outline: false,
      },
    },
    unit_outline: {
      stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
    },
    windows_line: {
      stroke: new Cesium.Color(0.77, 0.86, 0.93, 0.5),
      fill: new Cesium.Color(0.77, 0.86, 0.93, 0.5),
      outline: false,
    },
    opening_line: {
      open: new Cesium.Color(1, 1, 1, 0.05),
      default: new Cesium.Color(0.48, 0.89, 0.78, 0.23),
    },
    amenity_point: {
      // Restroom amenities with appropriate icons
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

      // Transportation amenities
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
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      ramp: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/ramp.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Service amenities
      parking: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/parking.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "parking.motorcycle": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/parking.motorcycle.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },
      "reception.desk": {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/reception.desk.svg",
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

      // Family amenities
      mothersroom: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/mothersroom.svg",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      },

      // Specialized amenities
      entry: {
        show: false,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 5,
        height: 5,
      },
      fieldofplay: {
        image:
          "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/others.png",
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 5,
        height: 5,
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
    occupant_point: {
      font: "Arial",
      eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
      fillColor: Cesium.Color.BLACK,
      outlineColor: Cesium.Color.BLACK,
    },
  };

  /**
   * Creates a new VenueIndoor instance
   *
   * @param {Cesium.Viewer} cesiumViewer - The Cesium viewer instance for 3D display
   * @param {string} venueId - The unique identifier for the venue to display
   *
   * @example
   * ```javascript
   * const venueIndoor = new VenueIndoor(viewer, 'HK_VENUE_001');
   * ```
   */
  constructor(cesiumViewer, venueId) {
    if (typeof venueId === "object") {
      this.#queryParam = `?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application%2Fjson&srsname=EPSG:4326&count=5000&cql_filter=venue_id%3D'${venueId}'`;
      this.#cesiumViewer = cesiumViewer;
      this.#venueId = venueId;
    } else {
      this.#queryParam = `?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application%2Fjson&srsname=EPSG:4326&count=5000&cql_filter=venue_id%3D'${venueId}'`;
      this.#cesiumViewer = cesiumViewer;
      this.#venueId = "";
    }
  }

  /**
   * Initializes the venue by fetching all indoor data and preparing data sources
   *
   * This method performs the following operations:
   * 1. Creates GeoJsonDataSource instances for each feature category
   * 2. Fetches data from all indoor APIs simultaneously
   * 3. Processes and caches the returned GeoJSON data
   * 4. Adds data sources to the Cesium viewer
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.init();
   * console.log('Venue data loaded and ready for display');
   * ```
   */
  async init() {
    // Initialize data sources for each feature category
    Object.keys(this.#indoorAPIs).forEach((featureCategory) => {
      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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

    // Fetch all venue data concurrently for better performance
    const results = await Promise.all(
      Object.keys(this.#indoorAPIs).map((key) =>
        fetch(`${this.#indoorAPIs[key]}${this.#queryParam}`)
      )
    );
    const values = await Promise.all(results.map((p) => p.json()));
    console.log(values);
    // Cache the fetched GeoJSON data
    let i = 0;
    Object.keys(this.#indoorAPIs).forEach((featureCategory) => {
      this.#geoJson[featureCategory] = values[i++];

      // Add data sources to viewer
      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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
  }

  /**
   * Displays all floors of the venue simultaneously
   *
   * This method clears existing entities and renders all venue data
   * without any floor filtering, providing a complete view of the
   * entire venue structure.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.showAllFloor();
   * // All floors of the venue are now visible
   * ```
   */
  async showAllFloor() {
    this.#cesiumViewer.entities.removeAll();
    Object.keys(this.#indoorAPIs).forEach((cate) => {
      this.showByCategory(cate, this.#geoJson[cate]);
    });
  }

  /**
   * Displays a specific floor of the venue
   *
   * This method filters the venue data to show only features
   * belonging to the specified floor level.
   *
   * @async
   * @param {string} floor - The floor identifier (e.g., 'G', '1', 'B1')
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.showFloor('G');  // Show ground floor
   * await venueIndoor.showFloor('2');  // Show second floor
   * await venueIndoor.showFloor('B1'); // Show basement level 1
   * ```
   */
  async showFloor(floor) {
    this.#cesiumViewer.entities.removeAll();
    Object.keys(this.#indoorAPIs).forEach((cate) => {
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
   * structure and connections between levels.
   *
   * @async
   * @param {number|string} ordinal - The ordinal value of the highest floor to display
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.showFloorWithLower(2);
   * // Shows floors with ordinal <= 2 (e.g., G, 1, 2)
   * ```
   */
  async showFloorWithLower(ordinal) {
    this.#cesiumViewer.entities.removeAll();
    Object.keys(this.#indoorAPIs).forEach((cate) => {
      const clone = structuredClone(this.#geoJson[cate]);
      clone.features = clone.features.filter(
        (f) => parseInt(f.properties.level_ordinal) <= parseInt(ordinal)
      );
      this.showByCategory(cate, clone);
    });
  }

  /**
   * Renders venue features by category with appropriate 3D styling
   *
   * This is the core rendering method that handles different feature types:
   * - Unit polygons: Flat colored areas representing rooms and spaces
   * - Unit outlines: 3D extruded walls and barriers
   * - Opening lines: Doors and openings with transparency
   * - Amenity points: Icon billboards for facilities
   * - Occupant points: Text labels for business/office names
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
      case "venue_polygon":
      case "level_polygon":
        // These are handled by other categories
        break;

      case "unit_outline":
        // Create 3D extruded corridors for unit outlines
        await this.#geoJsonDataSource[featureCategory].load(
          geojson,
          this.#styles[featureCategory]
        );
        this.#geoJsonDataSource[featureCategory].show = false;

        for (const entity of this.#geoJsonDataSource[featureCategory].entities
          .values) {
          if (
            !entity.properties.unitoutline_display_height._value ||
            parseFloat(entity.properties.unitoutline_display_height) == 0
          )
            continue;

          const baseHeight = parseFloat(entity.properties.level_z_value);
          const corr = {
            id: `${featureCategory}_${Math.random().toString(16).slice(2)}`,
            corridor: {
              positions: entity.polyline.positions,
              height: baseHeight,
              extrudedHeight:
                baseHeight +
                Math.max(
                  0,
                  -0.01 +
                    parseFloat(entity.properties.unitoutline_display_height)
                ),
              width: 0.1,
              material: new Cesium.Color(0.7, 0.7, 0.7, 0.25),
              outline: false,
              cornerType: Cesium.CornerType.MITERED,
            },
            properties: entity.properties,
          };
          this.#cesiumViewer.entities.add(corr);
        }
        break;

      case "opening_line":
        // Create 3D door and opening representations
        await this.#geoJsonDataSource[featureCategory].load(
          geojson,
          this.#styles[featureCategory]
        );
        this.#geoJsonDataSource[featureCategory].show = false;

        for (const entity of this.#geoJsonDataSource[featureCategory].entities
          .values) {
          if (
            !entity.properties.opening_display_height._value ||
            parseFloat(entity.properties.opening_display_height) == 0
          )
            continue;

          const baseHeight = parseFloat(entity.properties.level_z_value);
          const corr = {
            id: `${featureCategory}_${Math.random().toString(16).slice(2)}`,
            corridor: {
              positions: entity.polyline.positions,
              height: baseHeight,
              extrudedHeight:
                baseHeight +
                Math.max(
                  0,
                  -0.01 + parseFloat(entity.properties.opening_display_height)
                ),
              width: 0.12,
              material:
                this.#styles[featureCategory][
                  entity.properties.opening_door_type == "open"
                    ? "open"
                    : "default"
                ],
              outline: false,
              cornerType: Cesium.CornerType.MITERED,
            },
            properties: entity.properties,
          };
          this.#cesiumViewer.entities.add(corr);
        }
        break;

      case "unit_polygon":
        // Render colored floor areas by unit category
        const dataCategories = Object.keys(this.#styles[featureCategory]);

        dataCategories.forEach((dataCategory) => {
          const filteredFeatures = geojson.features.filter(
            (f) => f.properties.unit_category === dataCategory
          );
          const filteredClone = {
            ...geojson,
            features: filteredFeatures,
          };
          this.#geoJsonDataSource[featureCategory][dataCategory].load(
            filteredClone,
            this.#styles[featureCategory][dataCategory]
          );
        });

        // Handle units without specific categories
        const defaultFeatures = geojson.features.filter(
          (f) => !dataCategories.includes(f.properties.unit_category)
        );
        const defaultClone = {
          ...geojson,
          features: defaultFeatures,
        };
        if (defaultFeatures.length > 0) {
          this.#geoJsonDataSource[featureCategory]["default"].load(
            defaultClone,
            this.#styles[featureCategory]["default"]
          );
        }
        break;

      case "amenity_point":
        // Render amenity icons by category
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
                id: `${featureCategory}_${Math.random().toString(16).slice(2)}`,
                position: entity.position,
                billboard: this.#styles[featureCategory][dataCategory],
                properties: entity.properties,
              };
              this.#cesiumViewer.entities.add(amenityPoint);
            }
          }
        );
        break;

      case "occupant_point":
        // Render occupant name labels
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
            id: `${featureCategory}_${Math.random().toString(16).slice(2)}`,
            position: entity.position,
            label: lblStyle,
            properties: entity.properties,
          };
          this.#cesiumViewer.entities.add(lbl);
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
   * venue features while keeping the data sources intact.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * venueIndoor.removeAllFloor();
   * // All venue visualization cleared
   * ```
   */
  removeAllFloor() {
    this.#cesiumViewer.entities.removeAll();
    Object.keys(this.#indoorAPIs).forEach((featureCategory) => {
      const clone = structuredClone(this.#geoJson[featureCategory]);
      clone.features = [];

      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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
   * Creates interactive venue controls for floor selection
   *
   * This method generates a complete UI interface including:
   * - Venue information display with name
   * - Floor selection buttons with proper ordering
   * - "With lower floor" toggle for cumulative display
   * - Automatic event handling for user interactions
   *
   * The interface is inserted into the specified container element
   * and provides full floor navigation capabilities.
   *
   * @param {string} containerId - CSS selector for the container element
   * @returns {void}
   *
   * @example
   * ```javascript
   * venueIndoor.initVenueOption('#venue-controls');
   * // Creates interactive floor selection UI
   * ```
   */
  initVenueOption(containerId) {
    const floorSelectId = `floor-selection`;
    const toggleLowerId = `floor-mode-toggle`;
    this.#venueContainerId = containerId;
    const container = document.querySelector(containerId);

    // Create venue information and toggle controls
    let tempHtml = `<table class="infoPanel">
            <thead><tr><th colspan=2>${
              this.#geoJson["venue_polygon"].features[0].properties
                .venue_name_en
            }</th></tr></thread>
            <tbody>
                <tr><td><label for="${toggleLowerId}" style="cursor:pointer">With lower floor</label></td><td><input type="checkbox" id="${toggleLowerId}" /></td></tr>
            </tbody></table>`;

    // Create floor selection container
    tempHtml += `<div id="${floorSelectId}" class="infoPanel"><div data-floor="All" data-value="All" selected class="active">All</div></div>`;
    container.innerHTML = tempHtml;

    const floorSelect = document.querySelector(`#${floorSelectId}`);
    const toggleLower = document.querySelector(`#${toggleLowerId}`);

    // Process floor data and create selection options
    const levelList = this.#geoJson["level_polygon"].features;
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
   * Removes the venue control interface
   *
   * This method cleans up the UI by clearing the container
   * that holds the venue controls.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.deleteVenueOption();
   * // UI controls removed
   * ```
   */
  async deleteVenueOption() {
    document.querySelector(this.#venueContainerId).innerHTML = "";
  }

  /**
   * Applies Z-value clipping to all venue entities
   *
   * This method controls the visibility of venue entities based on their
   * Z-coordinates. For 3D extruded features (corridors, openings), it
   * shows them if their base Z-value is below the clipping threshold.
   *
   * @param {number} maxZ - Maximum Z-value in meters. Entities above this value will be hidden
   * @returns {void}
   *
   * @example
   * ```javascript
   * venueIndoor.applyZClipping(20.0);
   * // Shows all features with Z-values <= 20.0 meters
   * ```
   */
  applyZClipping(maxZ) {
    // Iterate through all entities in the viewer
    this.#cesiumViewer.entities.values.forEach((entity) => {
      // Check if this entity belongs to this venue instance
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
      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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
   * Resets Z-clipping to show all venue entities
   *
   * This method restores the visibility of all venue entities,
   * effectively removing any Z-value clipping constraints.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * venueIndoor.resetZClipping();
   * // All venue entities are now visible regardless of Z-value
   * ```
   */
  resetZClipping() {
    // Reset all venue entities to visible
    this.#cesiumViewer.entities.values.forEach((entity) => {
      if (entity.id && entity.id.includes(this.#uniqueId)) {
        entity.show = true;
      }
    });

    // Reset data source entities
    Object.keys(this.#geoJsonDataSource).forEach((featureCategory) => {
      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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
   * Gets the Z-value range of this venue
   *
   * This method analyzes all venue entities to determine the minimum
   * and maximum Z-values, which can be used for clipping range calculation.
   *
   * @returns {Object} Object with min and max Z-values: {min: number, max: number}
   *
   * @example
   * ```javascript
   * const zRange = venueIndoor.getZRange();
   * console.log(`Venue Z-range: ${zRange.min}m to ${zRange.max}m`);
   * ```
   */
  getZRange() {
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Check all venue entities
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
      if (["unit_polygon", "amenity_point"].includes(featureCategory)) {
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
   * Flies the camera to show the entire venue
   *
   * This method calculates the venue's bounding box and positions
   * the camera to provide an optimal view of the entire venue,
   * taking into account the venue's height and extent.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * ```javascript
   * await venueIndoor.flyTo();
   * // Camera positioned to show entire venue
   * ```
   */
  async flyTo() {
    const bbox = this.#geoJson["venue_polygon"].features[0].properties.bbox;
    const venueHeight = parseFloat(
      this.#geoJson["venue_polygon"].features[0].properties.venue_display_height
    );
    const center = Cesium.Cartesian3.fromDegrees(
      (bbox[0] + bbox[2]) / 2,
      (bbox[1] + bbox[3]) / 2,
      venueHeight / 2
    );
    const min = Cesium.Cartesian3.fromDegrees(bbox[0], bbox[1], 0);
    const max = Cesium.Cartesian3.fromDegrees(bbox[2], bbox[3], venueHeight);
    const minMaxDiff = Cesium.Cartesian3.distance(min, max);
    this.#cesiumViewer.camera.flyToBoundingSphere(
      new Cesium.BoundingSphere(center, minMaxDiff / 2)
    );
  }

  /**
   * Completely destroys the venue instance and cleans up resources
   *
   * This method performs comprehensive cleanup including:
   * - Removing all rendered entities
   * - Clearing UI controls
   * - Resetting data caches
   * - Cleaning up data sources
   *
   * Use this when switching to a different venue or closing the application.
   *
   * @returns {void}
   *
   * @example
   * ```javascript
   * venueIndoor.destroy();
   * // All venue data and UI cleaned up
   * ```
   */
  destroy() {
    this.removeAllFloor();
    this.deleteVenueOption();
    this.#geoJson = {};
    this.#geoJsonDataSource = {};
  }
}
