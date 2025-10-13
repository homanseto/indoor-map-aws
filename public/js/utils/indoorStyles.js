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
      stroke: new Cesium.Color(0.5, 0.5, 0.5, 1), // Medium grey for stroke
      fill: new Cesium.Color(0.3, 0.3, 0.3, 1), // Darker grey for fill
      outline: false,
    },
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
  window: {
    stroke: new Cesium.Color(0.77, 0.86, 0.93, 0.5),
    fill: new Cesium.Color(0.77, 0.86, 0.93, 0.5),
    outline: false,
  },
  opening: {
    stroke: new Cesium.Color(0.0, 1.0, 0.0, 1.0), // Bright green, fully opaque
    strokeWidth: 4, // Makes the stroke thicker (adjust as needed)
    fill: new Cesium.Color(0.0, 0.7, 0.0, 0.5), // Darker green, semi-transparent
    outline: false,
  },
  amenity: {
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
  occupant: {
    font: "Arial",
    eyeOffset: new Cesium.Cartesian3(0.0, 1.0, 0.0),
    fillColor: Cesium.Color.BLACK,
    outlineColor: Cesium.Color.BLACK,
  },
};
