// Initialize building search box functionality
export function initBuildingSearchBox() {
  // Create floating search container
  const searchContainer = document.createElement("div");
  searchContainer.id = "buildingSearchContainer";
  searchContainer.className = "building-search-container";

  // Create search input
  const searchInput = document.createElement("input");
  searchInput.id = "buildingSearchInput";
  searchInput.type = "text";
  searchInput.placeholder = "Search buildings...";
  searchInput.className = "building-search-input";

  // Create dropdown container
  const dropdownContainer = document.createElement("div");
  dropdownContainer.id = "buildingSearchDropdown";
  dropdownContainer.className = "search-dropdown";
  dropdownContainer.style.display = "none";

  // Assemble the search box
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(dropdownContainer);

  // Add to body as floating overlay
  document.body.appendChild(searchContainer);

  // Set up event listeners
  setupSearchEventListeners(searchInput, dropdownContainer);
}

// Set up search box event listeners
function setupSearchEventListeners(searchInput, dropdownContainer) {
  let allBuildings = [];

  // Extract building data from venue GeoJSON
  if (globalVenueGeoJson && globalVenueGeoJson.features) {
    allBuildings = globalVenueGeoJson.features
      .filter(
        (feature) => feature.properties && feature.properties.buildingName
      )
      .map((feature) => ({
        name: feature.properties.buildingName,
        venueId: feature.id,
        feature: feature,
      }));
  }

  // Show dropdown on focus
  searchInput.addEventListener("focus", () => {
    showSearchDropdown(dropdownContainer, allBuildings, "");
  });

  // Filter on input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    showSearchDropdown(dropdownContainer, allBuildings, query);
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (
      !searchInput.contains(e.target) &&
      !dropdownContainer.contains(e.target)
    ) {
      dropdownContainer.style.display = "none";
    }
  });

  // Handle enter key
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const visibleItems = dropdownContainer.querySelectorAll(
        ".search-dropdown-item:not([style*='display: none'])"
      );
      if (visibleItems.length > 0) {
        // Select first visible item
        const firstItem = visibleItems[0];
        const venueId = firstItem.dataset.venueId;
        selectBuilding(venueId, searchInput, dropdownContainer);
      }
    }
  });
}

// Show search dropdown with filtered results
function showSearchDropdown(dropdownContainer, buildings, query) {
  if (!dropdownContainer) return;

  dropdownContainer.innerHTML = "";

  const filteredBuildings = buildings.filter((building) => {
    if (!query) return true;
    return building.name.toLowerCase().includes(query.toLowerCase());
  });

  if (filteredBuildings.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "search-dropdown-item no-results";
    noResults.textContent = "No buildings found";
    dropdownContainer.appendChild(noResults);
  } else {
    filteredBuildings.forEach((building) => {
      const item = document.createElement("div");
      item.className = "search-dropdown-item";
      item.dataset.venueId = building.venueId;
      item.textContent = building.name;

      // Click handler
      item.addEventListener("click", () => {
        selectBuilding(
          building.venueId,
          document.getElementById("buildingSearchInput"),
          dropdownContainer
        );
      });

      dropdownContainer.appendChild(item);
    });
  }

  dropdownContainer.style.display = "block";
}
