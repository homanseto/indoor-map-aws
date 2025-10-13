// Utility functions for geometry operations
export function getCentroid(positions) {
  // Simple centroid calculation for an array of Cesium.Cartesian3
  let x = 0,
    y = 0,
    z = 0;
  positions.forEach((pos) => {
    x += pos.x;
    y += pos.y;
    z += pos.z;
  });
  const n = positions.length;
  return new Cesium.Cartesian3(x / n, y / n, z / n);
}

// Add more geometry utilities as needed
