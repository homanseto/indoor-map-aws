// Shared indoor style configuration for VenueIndoor, BuildingIndoor, etc.
// Import this in any module that needs indoor styles.

export const indoorStyles = {
  venue: {
    stroke: new Cesium.Color(0, 0, 0, 0),
    fill: new Cesium.Color(0.82, 0.75, 0.99, 1),
    outline: false,
  },
  level: {
    stroke: new Cesium.Color(0, 0, 0, 0),
    fill: new Cesium.Color(0.96, 0.72, 0.99, 1),
    outline: false,
  },
  unit: {
    // Educational and meeting spaces
    restricted: {
      stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
      fill: new Cesium.Color(0.61, 0.61, 0.61, 1),
      outline: false,
    },
    auditorium: {
      stroke: new Cesium.Color(0.902, 0.824, 0.725, 1),
      fill: new Cesium.Color(0.902, 0.824, 0.725, 1),
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
    opentobelow: {
      stroke: new Cesium.Color(0, 0, 0, 0.2),
      fill: new Cesium.Color(1, 1, 1, 0.2),
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
      stroke: new Cesium.Color(0.902, 0.824, 0.725, 1),
      fill: new Cesium.Color(0.902, 0.824, 0.725, 1),
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
      stroke: new Cesium.Color(0.635, 0.608, 0.996, 1),
      fill: new Cesium.Color(0.635, 0.608, 0.996, 1),
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
      stroke: new Cesium.Color(0.902, 0.824, 0.72, 1),
      fill: new Cesium.Color(1, 1, 1, 1),
      outline: false,
    },
    default: {
      stroke: new Cesium.Color(0.902, 0.824, 0.725, 1),
      fill: new Cesium.Color(0.902, 0.824, 0.725, 1),
      outline: false,
    },
  },
  unit_outline: {
    stroke: new Cesium.Color(0.7, 0.7, 0.7, 1),
  },
  window: {
    stroke: new Cesium.Color(0.7, 0.3, 0.8, 0.5), // Purple with some transparency
    strokeWidth: 4,
    fill: new Cesium.Color(0.7, 0.3, 0.8, 0.5), // Purple with some transparency
    outline: false,
  },
  opening: {
    stroke: new Cesium.Color(0.0, 1.0, 0.0, 1.0), // Bright green, fully opaque
    strokeWidth: 4, // Makes the stroke thicker (adjust as needed)
    fill: new Cesium.Color(0.0, 0.7, 0.0, 0.5), // Darker green, semi-transparent
    outline: false,
  },
  amenity: (() => {
    // Fallback list of known amenity icons (used if auto-detection fails)
    const knownAmenityTypes = [
      "elevator",
      "entry",
      "escalator",
      "faregate",
      "fieldofplay",
      "information",
      "mothersroom",
      "movingwalkway",
      "parking.ev",
      "parking.motorcycle",
      "parking",
      "platform",
      "police",
      "rail.muni",
      "ramp",
      "reception.desk",
      "restroom.female",
      "restroom.male",
      "restroom.unisex",
      "restroom.wheelchair",
      "security",
      "stairs",
      "swimmingpool",
      "taxi",
    ];

    // Function to auto-detect available amenity icons
    async function detectAmenityTypes() {
      try {
        // Try to fetch the directory listing from the server
        const response = await fetch("./images/icon/amenity/", {
          method: "GET",
        });

        if (response.ok) {
          const html = await response.text();
          // Parse HTML to extract SVG filenames
          const svgMatches = html.match(/href="([^"]+\.svg)"/g);
          if (svgMatches) {
            return svgMatches
              .map((match) => match.match(/href="([^"]+)\.svg"/)[1])
              .filter((name) => !name.includes("/")) // Exclude subdirectories
              .sort();
          }
        }
      } catch (error) {
        console.warn(
          "Could not auto-detect amenity icons, using fallback list:",
          error
        );
      }

      // Return fallback list if auto-detection fails
      return knownAmenityTypes;
    }

    // Generate amenity configuration object dynamically
    const amenityConfig = {};

    // Use known types immediately (synchronous)
    knownAmenityTypes.forEach((type) => {
      // Special configurations for certain amenity types
      if (type === "entry") {
        amenityConfig[type] = {
          image: `./images/icon/amenity/${type}.svg`,
          show: false,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
          alignedAxis: Cesium.Cartesian3.ZERO,
          width: 5,
          height: 5,
        };
      } else if (type === "fieldofplay") {
        amenityConfig[type] = {
          image: `./images/icon/amenity/${type}.svg`,
          show: true,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
          alignedAxis: Cesium.Cartesian3.ZERO,
          width: 5,
          height: 5,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
        };
      } else {
        // Standard configuration for most amenity types
        amenityConfig[type] = {
          image: `./images/icon/amenity/${type}.svg`,
          show: true,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
          alignedAxis: Cesium.Cartesian3.ZERO,
          width: 30,
          height: 30,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
        };
      }
    });

    // Add legacy configurations that might still use external URLs
    // (These will be overridden by auto-detected local icons if available)
    amenityConfig["unspecified"] = {
      image:
        "https://mapapi.hkmapservice.gov.hk/resources/images/indoor/unspecified.png",
      show: true,
      pixelOffset: new Cesium.Cartesian2(0, 0),
      eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
      alignedAxis: Cesium.Cartesian3.ZERO,
      width: 5,
      height: 5,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
    };

    // Async enhancement: detect and add any new icons
    detectAmenityTypes().then((detectedTypes) => {
      detectedTypes.forEach((type) => {
        if (!amenityConfig[type]) {
          console.log(`✨ Auto-detected new amenity icon: ${type}`);
          amenityConfig[type] = {
            image: `./images/icon/amenity/${type}.svg`,
            show: true,
            pixelOffset: new Cesium.Cartesian2(0, 0),
            eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
            alignedAxis: Cesium.Cartesian3.ZERO,
            width: 30,
            height: 30,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              350
            ),
          };
        }
      });
    });

    return amenityConfig;
  })(),
  occupant: (() => {
    // Fallback list of known occupant icons (used if auto-detection fails)
    const knownOccupantTypes = [
      "atm",
      "bank",
      "blooddonationcenter",
      "busstop",
      "cinema",
      "communitycenter",
      "conveniencestore",
      "dancestudio",
      "eventspace",
      "foodstand",
      "gourmetmarket",
      "gym",
      "library",
      "performingarts",
      "publictransport",
      "restaurant",
      "seniorcenter",
      "shopping",
      "supermarket",
      "trainstation",
      "travelagent",
    ];

    // Function to auto-detect available occupant icons
    async function detectOccupantTypes() {
      try {
        // Try to fetch the directory listing from the server
        const response = await fetch("./images/icon/occupant/", {
          method: "GET",
        });

        if (response.ok) {
          const html = await response.text();
          // Parse HTML to extract SVG filenames
          const svgMatches = html.match(/href="([^"]+\.svg)"/g);
          if (svgMatches) {
            return svgMatches
              .map((match) => match.match(/href="([^"]+)\.svg"/)[1])
              .filter((name) => !name.includes("/")) // Exclude subdirectories
              .sort();
          }
        }
      } catch (error) {
        console.warn(
          "Could not auto-detect occupant icons, using fallback list:",
          error
        );
      }

      // Return fallback list if auto-detection fails
      return knownOccupantTypes;
    }

    // Generate occupant configuration object dynamically
    const occupantConfig = {};

    // Use known types immediately (synchronous)
    knownOccupantTypes.forEach((type) => {
      occupantConfig[type] = {
        image: `./images/icon/occupant/${type}.svg`,
        show: true,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
        alignedAxis: Cesium.Cartesian3.ZERO,
        width: 30,
        height: 30,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 350),
      };
    });

    // Async enhancement: detect and add any new icons
    detectOccupantTypes().then((detectedTypes) => {
      detectedTypes.forEach((type) => {
        if (!occupantConfig[type]) {
          console.log(`✨ Auto-detected new occupant icon: ${type}`);
          occupantConfig[type] = {
            image: `./images/icon/occupant/${type}.svg`,
            show: true,
            pixelOffset: new Cesium.Cartesian2(0, 0),
            eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
            alignedAxis: Cesium.Cartesian3.ZERO,
            width: 30,
            height: 30,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
              0,
              350
            ),
          };
        }
      });
    });

    return occupantConfig;
  })(),
  indoorNetwork: {
    N: {
      stroke: new Cesium.Color(0.0, 0.0, 1.0, 1.0), // Bright blue, fully opaque
      strokeWidth: 4, // Makes the stroke thicker (adjust as needed)
      fill: new Cesium.Color(0.0, 0.0, 0.7, 0.5), // Darker blue, semi-transparent
      outline: false,
    },
    Y: {
      stroke: new Cesium.Color(1.0, 0.0, 0.0, 1.0), // Bright red, fully opaque
      strokeWidth: 4, // Makes the stroke thicker (adjust as needed)
      fill: new Cesium.Color(0.7, 0.0, 0.0, 0.5), // Darker red, semi-transparent
      outline: false,
    },
  },
  wall: {
    // Default wall styling with transparency
    default: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.9, 0.9, 0.9, 0.3)
      ), // Light gray, semi-transparent
      outline: true,
      outlineColor: new Cesium.Color(0.6, 0.6, 0.6, 0.8), // Darker gray outline
      extrudedHeight: 0, // Will be set dynamically
      height: 0, // Will be set dynamically
    },
    // Category-specific wall styles (matching unit categories)
    restricted: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.5, 0.5, 0.5, 0.4)
      ), // Medium gray
      outline: true,
      outlineColor: new Cesium.Color(0.3, 0.3, 0.3, 0.8),
    },
    classroom: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.98, 0.83, 0.87, 0.25)
      ), // Light pink tint
      outline: true,
      outlineColor: new Cesium.Color(0.8, 0.6, 0.7, 0.8),
    },
    restroom: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.91, 0.75, 1, 0.35)
      ), // Light purple tint
      outline: true,
      outlineColor: new Cesium.Color(0.7, 0.5, 0.8, 0.8),
    },
    elevator: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.75, 1, 0.91, 0.3)
      ), // Light green tint
      outline: true,
      outlineColor: new Cesium.Color(0.5, 0.8, 0.7, 0.8),
    },
    stairs: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.75, 1, 0.91, 0.3)
      ), // Light green tint
      outline: true,
      outlineColor: new Cesium.Color(0.5, 0.8, 0.7, 0.8),
    },
    // Add more categories as needed - they'll fall back to default if not specified
  },
  "window-wall": {
    default: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.137, 0.909, 0.98, 0.3)
      ), // Purple with some transparency
      outline: true,
      outlineColor: new Cesium.Color(0.4, 0.2, 0.1, 0.8), // Darker brown outline
      extrudedHeight: 0, // Will be set dynamically
      height: 0, // Will be set dynamically
    },
  },
  door: {
    // Default door styling with transparency - similar to walls but more transparent
    pedestrian: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.6, 0.4, 0.2, 0.4)
      ), // Brown wood-like color, semi-transparent
      outline: true,
      outlineColor: new Cesium.Color(0.4, 0.2, 0.1, 0.8), // Darker brown outline
      extrudedHeight: 0, // Will be set dynamically
      height: 0, // Will be set dynamically
    },
    // Category-specific door styles
    emergencyexit: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.0, 0.5, 0.8, 0.5)
      ), // Blue for main entrances
      outline: true,
      outlineColor: new Cesium.Color(0.0, 0.3, 0.6, 0.8),
    },
    "pedestrian.principal": {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.8, 0.2, 0.2, 0.6)
      ), // Red for emergency exits
      outline: true,
      outlineColor: new Cesium.Color(0.6, 0.1, 0.1, 0.8),
    },
    service: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(0.7, 0.6, 0.4, 0.3)
      ), // Light brown for internal doors
      outline: true,
      outlineColor: new Cesium.Color(0.5, 0.4, 0.2, 0.8),
    },
  },
  // Feature highlighting styles for selection
  highlight: {
    // Polygon feature highlighting (units, openings, windows)
    polygon: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(1.0, 1.0, 0.0, 0.3)
      ), // Yellow with transparency
      outline: true,
      outlineColor: new Cesium.Color(1.0, 1.0, 0.0, 0.8), // Bright yellow outline
      outlineWidth: 3,
    },
    // Point feature highlighting (amenities, occupants) - glow effect
    point: {
      // Glow circle behind the icon
      ellipse: {
        semiMinorAxis: 20.0,
        semiMajorAxis: 20.0,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.Color(1.0, 1.0, 0.0, 0.4)
        ), // Yellow glow
        outline: true,
        outlineColor: new Cesium.Color(1.0, 1.0, 0.0, 0.8),
        outlineWidth: 2,
        height: 0.1, // Slightly above ground to avoid z-fighting
      },
    },
    // Linestring feature highlighting (openings, windows, walls)
    linestring: {
      material: new Cesium.ColorMaterialProperty(
        new Cesium.Color(1.0, 1.0, 0.0, 0.8)
      ), // Bright yellow for visibility
      width: 5, // Thicker line for highlighting
      clampToGround: true, // Ensure line stays on ground
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1000),
      strokeWidth: 6,
    },
  },
};
