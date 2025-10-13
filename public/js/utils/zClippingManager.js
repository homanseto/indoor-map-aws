// ZClippingManager utility for modular Z-clipping logic
// Usage: ZClippingManager.applyToAllBuildings(activeBuildings, zValue)
export const ZClippingManager = {
  // Applies Z-clipping to all loaded BuildingIndoor instances
  applyToAllBuildings(activeBuildings, zValue) {
    activeBuildings.forEach((buildingIndoor) => {
      if (
        buildingIndoor &&
        typeof buildingIndoor.applyZClipping === "function"
      ) {
        buildingIndoor.applyZClipping(zValue);
      }
    });
  },
};
