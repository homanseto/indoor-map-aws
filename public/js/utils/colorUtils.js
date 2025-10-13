// Utility functions for color operations
export function hexToCesiumColor(hex, alpha = 1.0) {
  // Converts hex color to Cesium.Color
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
}

// Add more color utilities as needed
