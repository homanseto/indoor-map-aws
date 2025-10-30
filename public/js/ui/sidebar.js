import { indoorStyles } from "../utils/indoorStyles.js";

/**
 * Sidebar UI Component for Indoor Map Viewer
 * Provides a resizable sidebar with legend functionality
 * Automatically repositions Cesium info box to avoid overlap
 */
export class Sidebar {
  constructor(viewer) {
    this.viewer = viewer;
    this.isVisible = false;
    this.width = 320; // Default width in pixels
    this.minWidth = 250;
    this.maxWidth = 600;
    this.isResizing = false;

    // DOM elements
    this.container = null;
    this.toggleButton = null;
    this.resizeHandle = null;
    this.content = null;

    this.init();
  }

  init() {
    this.createSidebar();
    this.createToggleButton();
    this.setupEventListeners();
    this.setupInfoBoxMonitoring();
    this.createLegend();
  }

  createSidebar() {
    // Create main sidebar container
    this.container = document.createElement("div");
    this.container.id = "mapSidebar";
    this.container.className = "map-sidebar";
    this.container.style.width = `${this.width}px`;

    // Create resize handle
    this.resizeHandle = document.createElement("div");
    this.resizeHandle.className = "sidebar-resize-handle";
    this.resizeHandle.title = "Drag to resize";

    // Create sidebar header
    const header = document.createElement("div");
    header.className = "sidebar-header";

    const title = document.createElement("h3");
    title.className = "sidebar-title";
    title.textContent = "Map Legend";
    header.appendChild(title);

    // Create sidebar content area
    this.content = document.createElement("div");
    this.content.className = "sidebar-content";
    this.content.id = "sidebarContent";

    // Assemble sidebar
    this.container.appendChild(this.resizeHandle);
    this.container.appendChild(header);
    this.container.appendChild(this.content);

    // Add to DOM (hidden by default)
    document.body.appendChild(this.container);
  }

  createToggleButton() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "sidebarToggle";
    this.toggleButton.className = "sidebar-toggle-btn";
    this.toggleButton.innerHTML = "◀"; // Arrow pointing left
    this.toggleButton.title = "Show/Hide Legend";
    this.toggleButton.setAttribute("aria-label", "Toggle sidebar visibility");

    document.body.appendChild(this.toggleButton);
  }

  setupEventListeners() {
    // Toggle button click
    this.toggleButton.addEventListener("click", () => {
      this.toggle();
    });

    // Resize functionality
    this.resizeHandle.addEventListener("mousedown", (e) => {
      this.startResize(e);
    });

    // Keyboard accessibility for toggle
    this.toggleButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  startResize(e) {
    this.isResizing = true;
    const startX = e.clientX;
    const startWidth = this.width;

    const handleMouseMove = (e) => {
      if (!this.isResizing) return;

      const deltaX = startX - e.clientX; // Distance moved left (negative) or right (positive)
      const newWidth = Math.max(
        this.minWidth,
        Math.min(this.maxWidth, startWidth + deltaX)
      );

      this.width = newWidth;
      this.container.style.width = `${newWidth}px`;

      // Update toggle button position if sidebar is visible
      if (this.isVisible) {
        this.updateTogglePosition();
      }

      // Update info box positioning
      this.updateInfoBoxPosition();
    };

    const handleMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  }

  toggle() {
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      this.show();
    } else {
      this.hide();
    }
  }

  show() {
    this.isVisible = true;
    this.container.classList.add("visible");
    this.toggleButton.innerHTML = "▶"; // Arrow pointing right
    this.toggleButton.classList.add("sidebar-open");
    this.updateTogglePosition();
    this.updateInfoBoxPosition();
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove("visible");
    this.toggleButton.innerHTML = "◀"; // Arrow pointing left
    this.toggleButton.classList.remove("sidebar-open");
    this.toggleButton.style.right = "20px"; // Reset to default position
    this.updateInfoBoxPosition();
  }

  updateTogglePosition() {
    if (this.isVisible) {
      this.toggleButton.style.right = `${this.width + 30}px`;
    } else {
      this.toggleButton.style.right = "20px";
    }
  }

  updateInfoBoxPosition() {
    if (!this.viewer || !this.viewer.infoBox) return;

    const infoBoxContainer = this.viewer.infoBox.container;
    if (!infoBoxContainer) return;

    if (this.isVisible) {
      // Position info box to the left of sidebar with some margin
      infoBoxContainer.style.right = `${this.width + 40}px`;
      infoBoxContainer.style.maxWidth = `${
        window.innerWidth - this.width - 80
      }px`;
    } else {
      // Reset to default positioning
      infoBoxContainer.style.right = "20px";
      infoBoxContainer.style.maxWidth = "";
    }
  }

  setupInfoBoxMonitoring() {
    if (!this.viewer || !this.viewer.infoBox) return;

    // Override the info box show method to apply our positioning
    const originalShowInfo = this.viewer.infoBox._showInfo;

    this.viewer.infoBox._showInfo = (...args) => {
      const result = originalShowInfo.apply(this.viewer.infoBox, args);
      // Apply our custom positioning after the info box is shown
      setTimeout(() => this.updateInfoBoxPosition(), 10);
      return result;
    };

    // Monitor window resize
    window.addEventListener("resize", () => {
      this.updateInfoBoxPosition();
    });
  }

  createLegend() {
    if (!this.content) return;

    // Clear existing content
    this.content.innerHTML = "";

    // Create legend sections
    const legendSections = this.getLegendSections();

    legendSections.forEach((section, index) => {
      const sectionElement = this.createLegendSection(section, index);
      this.content.appendChild(sectionElement);
    });
  }

  createLegendSection(section, index) {
    const sectionContainer = document.createElement("div");
    sectionContainer.className = "legend-section";

    // Create collapsible header
    const header = document.createElement("div");
    header.className = "legend-header";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-expanded", "true");

    const title = document.createElement("h4");
    title.className = "legend-title";
    title.textContent = section.title;

    const chevron = document.createElement("span");
    chevron.className = "legend-chevron";
    chevron.innerHTML = "▼";

    header.appendChild(title);
    header.appendChild(chevron);

    // Create items container
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "legend-items expanded";
    itemsContainer.id = `legend-items-${index}`;

    // Add legend items
    section.items.forEach((item) => {
      const itemElement = this.createLegendItem(item);
      itemsContainer.appendChild(itemElement);
    });

    // Make header collapsible
    const toggleSection = () => {
      const isExpanded = itemsContainer.classList.contains("expanded");
      itemsContainer.classList.toggle("expanded");
      chevron.innerHTML = isExpanded ? "▶" : "▼";
      header.setAttribute("aria-expanded", (!isExpanded).toString());
    };

    header.addEventListener("click", toggleSection);
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSection();
      }
    });

    sectionContainer.appendChild(header);
    sectionContainer.appendChild(itemsContainer);

    return sectionContainer;
  }

  createLegendItem(item) {
    const itemElement = document.createElement("div");
    itemElement.className = "legend-item";

    // Create color/icon indicator
    const indicator = document.createElement("div");
    indicator.className = `legend-indicator ${item.shape || "square"}`;

    if (item.backgroundColor) {
      indicator.style.backgroundColor = item.backgroundColor;
    }
    if (item.borderColor) {
      indicator.style.borderColor = item.borderColor;
    }
    if (item.iconUrl) {
      indicator.style.backgroundImage = `url(${item.iconUrl})`;
      indicator.style.backgroundSize = "contain";
      indicator.style.backgroundRepeat = "no-repeat";
      indicator.style.backgroundPosition = "center";
    }

    // Create label
    const label = document.createElement("span");
    label.className = "legend-label";
    label.textContent = item.label;

    itemElement.appendChild(indicator);
    itemElement.appendChild(label);

    return itemElement;
  }

  getLegendSections() {
    const sections = [];

    // Unit Types Section
    if (indoorStyles.unit) {
      sections.push({
        title: "Unit Types",
        items: this.getUnitLegendItems(),
      });
    }

    // Amenities Section
    if (indoorStyles.amenity) {
      sections.push({
        title: "Amenities",
        items: this.getAmenityLegendItems(),
      });
    }

    // Occupants Section
    if (indoorStyles.occupant) {
      sections.push({
        title: "Occupants",
        items: this.getOccupantLegendItems(),
      });
    }

    // Features Section (windows, openings, network)
    sections.push({
      title: "Building Features",
      items: this.getFeatureLegendItems(),
    });

    return sections;
  }

  getUnitLegendItems() {
    const items = [];
    const unitStyles = indoorStyles.unit;

    // Major unit categories
    const majorCategories = [
      "classroom",
      "office",
      "restroom",
      "elevator",
      "stairs",
      "lobby",
      "parking",
      "storage",
      "library",
      "laboratory",
      "foodservice",
      "retail",
      "residential",
    ];

    majorCategories.forEach((category) => {
      if (unitStyles[category]) {
        const style = unitStyles[category];
        const fillColor = style.fill;

        items.push({
          label: this.formatLabel(category),
          backgroundColor: this.colorToRgba(fillColor),
          borderColor: style.stroke ? this.colorToRgba(style.stroke) : "#666",
          shape: "square",
        });
      }
    });

    return items;
  }

  getAmenityLegendItems() {
    const items = [];
    const amenityStyles = indoorStyles.amenity;

    // Major amenity types
    const majorAmenities = [
      "elevator",
      "stairs",
      "restroom.male",
      "restroom.female",
      "parking",
      "information",
      "atm",
      "wifi",
    ];

    majorAmenities.forEach((amenity) => {
      if (amenityStyles[amenity]) {
        items.push({
          label: this.formatLabel(amenity.replace(".", " ")),
          iconUrl: amenityStyles[amenity].image,
          shape: "circle",
        });
      }
    });

    return items;
  }

  getOccupantLegendItems() {
    const items = [];
    const occupantStyles = indoorStyles.occupant;

    // Major occupant types
    const majorOccupants = [
      "restaurant",
      "shopping",
      "bank",
      "gym",
      "library",
      "medical",
      "education",
      "government",
    ];

    majorOccupants.forEach((occupant) => {
      if (occupantStyles[occupant]) {
        items.push({
          label: this.formatLabel(occupant),
          iconUrl: occupantStyles[occupant].image,
          shape: "circle",
        });
      }
    });

    return items;
  }

  getFeatureLegendItems() {
    const items = [];

    // Windows
    if (indoorStyles.window) {
      const windowStyle = indoorStyles.window;
      items.push({
        label: "Windows",
        backgroundColor: this.colorToRgba(windowStyle.fill),
        borderColor: this.colorToRgba(windowStyle.stroke),
        shape: "square",
      });
    }

    // Openings
    if (indoorStyles.opening) {
      const openingStyle = indoorStyles.opening;
      items.push({
        label: "Openings",
        backgroundColor: this.colorToRgba(openingStyle.fill),
        borderColor: this.colorToRgba(openingStyle.stroke),
        shape: "square",
      });
    }

    // Indoor Network
    if (indoorStyles.indoorNetwork) {
      if (indoorStyles.indoorNetwork.Y) {
        items.push({
          label: "Restricted Network",
          backgroundColor: this.colorToRgba(
            indoorStyles.indoorNetwork.Y.stroke
          ),
          shape: "line",
        });
      }
      if (indoorStyles.indoorNetwork.N) {
        items.push({
          label: "Public Network",
          backgroundColor: this.colorToRgba(
            indoorStyles.indoorNetwork.N.stroke
          ),
          shape: "line",
        });
      }
    }

    return items;
  }

  colorToRgba(cesiumColor) {
    if (!cesiumColor) return "#ccc";

    const r = Math.floor(cesiumColor.red * 255);
    const g = Math.floor(cesiumColor.green * 255);
    const b = Math.floor(cesiumColor.blue * 255);
    const a = cesiumColor.alpha || 1;

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  formatLabel(text) {
    return text
      .replace(/([A-Z])/g, " $1")
      .replace(/\./g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  // Public methods for external control
  refresh() {
    this.createLegend();
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }

    // Clean up event listeners
    window.removeEventListener("resize", this.updateInfoBoxPosition);
  }
}

// Factory function for easy instantiation
export function createSidebar(viewer) {
  return new Sidebar(viewer);
}

// Convenience functions for backward compatibility
export function initSidebar(viewer) {
  const sidebar = new Sidebar(viewer);
  window.mapSidebar = sidebar; // Store reference globally if needed
  return sidebar;
}

export function setupInfoBoxMonitoring(viewer) {
  // This is now handled within the Sidebar class constructor
  // Keeping this function for backward compatibility
  if (window.mapSidebar) {
    window.mapSidebar.setupInfoBoxMonitoring();
  }
}
