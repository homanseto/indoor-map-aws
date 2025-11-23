import { indoorStyles } from "../utils/indoorStyles.js";
import { appState } from "../shared/AppState.js";
import { StateHooks, StateActions } from "../shared/AppStateHooks.js";
import { persistenceService } from "../services/PersistenceService.js";
import { notificationSystem } from "./NotificationSystem.js";

/**
 * Sidebar UI Component for Indoor Map Viewer
 * Provides a resizable sidebar with legend functionality and 2D view controls
 * Automatically repositions Cesium info box to avoid overlap
 *
 * Now integrated with centralized state management for reactive updates
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
    this.viewControls = null;
    this.view2DButton = null;
    this.wallToggleButton = null;
    this.pnTilesToggleButton = null;
    this.buildingInstance = null;

    // State management hooks
    this.stateCleanups = [];

    this.init();
  }

  init() {
    this.createSidebar();
    this.createToggleButton();
    this.setupEventListeners();
    this.setupInfoBoxMonitoring();
    this.create2DViewControls();
    this.createLegend();
    this.setupStateManagement();
    this.restoreSidebarState();

    // NEW: Set initial CSS variable for sidebar width
    document.body.style.setProperty('--sidebar-width', `${this.width}px`);
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

    // Create view controls area
    this.viewControls = document.createElement("div");
    this.viewControls.className = "sidebar-view-controls";
    this.viewControls.id = "sidebarViewControls";

    // Create sidebar content area
    this.content = document.createElement("div");
    this.content.className = "sidebar-content";
    this.content.id = "sidebarContent";

    // Assemble sidebar
    this.container.appendChild(this.resizeHandle);
    this.container.appendChild(header);
    this.container.appendChild(this.viewControls);
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

    // Create hover tooltip for map legend preview
    this.createToggleTooltip();

    document.body.appendChild(this.toggleButton);
  }

  createToggleTooltip() {
    this.toggleTooltip = document.createElement("div");
    this.toggleTooltip.id = "sidebarToggleTooltip";
    this.toggleTooltip.className = "sidebar-toggle-tooltip";
    this.toggleTooltip.innerHTML = `<div class="tooltip-header">Map Legend</div>`;

    document.body.appendChild(this.toggleTooltip);
  }

  create2DViewControls() {
    if (!this.viewControls) {
      console.error("[Sidebar] viewControls element not found");
      return;
    }

    // Clear existing content
    this.viewControls.innerHTML = "";

    // Create 2D view toggle section
    const viewSection = document.createElement("div");
    viewSection.className = "view-control-section";

    const viewLabel = document.createElement("h4");
    viewLabel.className = "view-control-title";
    viewLabel.textContent = "View Mode";

    // Create 2D view button
    this.view2DButton = document.createElement("button");
    this.view2DButton.className = "view-2d-button";
    this.view2DButton.innerHTML = `
      <span class="view-button-icon">📐</span>
      <span class="view-button-text">2D Top View</span>
    `;
    this.view2DButton.title = "Switch to 2D top-down view";
    this.view2DButton.disabled = true; // Initially disabled until building is selected

    // Create status indicator
    const statusIndicator = document.createElement("div");
    statusIndicator.className = "view-status-indicator";
    statusIndicator.textContent = "Select a building to enable 2D view";

    viewSection.appendChild(viewLabel);
    viewSection.appendChild(this.view2DButton);
    viewSection.appendChild(statusIndicator);

    // ✅ ADD WALL TOGGLE BUTTON directly under 2D button
    this.createWallToggleButton();
    viewSection.appendChild(this.wallToggleButton);

    // ✅ ADD PNTILES TOGGLE BUTTON under wall toggle
    this.createPNTilesToggleButton();
    viewSection.appendChild(this.pnTilesToggleButton);

    this.viewControls.appendChild(viewSection);

    // Setup event listener for 2D view button (after button is created)
    this.view2DButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleViewModeToggle();
    });
  }

  createWallToggleButton() {
    // Create wall visibility toggle button
    this.wallToggleButton = document.createElement("button");
    this.wallToggleButton.className = "wall-toggle-button";
    this.wallToggleButton.innerHTML = `
      <span class="wall-icon">🧱</span>
      <span class="wall-button-text">Toggle Walls</span>
    `;
    this.wallToggleButton.title = "Show/Hide building walls in 3D view";

    // Initially enabled only in 3D mode with building
    this.updateWallButtonState();

    // Event listener for wall toggle
    this.wallToggleButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      appState.toggleWallsVisible();
    });
  }

  createPNTilesToggleButton() {
    // Create PNTiles visibility toggle button
    this.pnTilesToggleButton = document.createElement("button");
    this.pnTilesToggleButton.className = "pntiles-toggle-button";
    this.pnTilesToggleButton.innerHTML = `
      <span class="pntiles-icon">🚶</span>
      <span class="pntiles-button-text">Toggle Pedestrian Network</span>
    `;
    this.pnTilesToggleButton.title = "Show/Hide 3D Pedestrian Network";

    // Update initial state
    this.updatePNTilesButtonState();

    // Event listener for PNTiles toggle
    this.pnTilesToggleButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentVisible = appState.getTilesetVisible("PNTiles");
      appState.setTilesetVisible("PNTiles", !currentVisible);
    });
  }

  updateWallButtonState() {
    if (!this.wallToggleButton) return;

    const is2DMode = appState.isIn2DMode();
    const wallsVisible = appState.getWallsVisible();
    const hasBuilding = this.buildingInstance !== null;

    // Button enabled only in 3D mode with building loaded
    this.wallToggleButton.disabled = is2DMode || !hasBuilding;

    // Update button appearance based on wall visibility
    this.wallToggleButton.classList.remove("walls-visible", "walls-hidden");
    if (wallsVisible) {
      this.wallToggleButton.classList.add("walls-visible");
    } else {
      this.wallToggleButton.classList.add("walls-hidden");
    }

    // Update button text
    const buttonText = this.wallToggleButton.querySelector(".wall-button-text");
    if (is2DMode) {
      buttonText.textContent = "Walls (2D Mode)";
      this.wallToggleButton.title = "Walls are automatically hidden in 2D mode";
    } else if (!hasBuilding) {
      buttonText.textContent = "Toggle Walls";
      this.wallToggleButton.title = "Select a building to toggle walls";
    } else {
      buttonText.textContent = wallsVisible ? "Hide Walls" : "Show Walls";
      this.wallToggleButton.title = wallsVisible
        ? "Hide building walls"
        : "Show building walls";
    }
  }

  updatePNTilesButtonState() {
    if (!this.pnTilesToggleButton) return;

    const pnTilesVisible = appState.getTilesetVisible("PNTiles");
    const pnTilesLoaded = appState.isTilesetActive("PNTiles");

    // Button enabled when PNTiles are loaded
    this.pnTilesToggleButton.disabled = !pnTilesLoaded;

    // Update button appearance based on visibility
    this.pnTilesToggleButton.classList.remove(
      "pntiles-visible",
      "pntiles-hidden"
    );
    if (pnTilesVisible) {
      this.pnTilesToggleButton.classList.add("pntiles-visible");
    } else {
      this.pnTilesToggleButton.classList.add("pntiles-hidden");
    }

    // Update button text
    const buttonText = this.pnTilesToggleButton.querySelector(
      ".pntiles-button-text"
    );
    if (!pnTilesLoaded) {
      buttonText.textContent = "Loading...";
      this.pnTilesToggleButton.title = "Pedestrian Network is loading";
    } else if (pnTilesVisible) {
      buttonText.textContent = "Hide Pedestrian Network";
      this.pnTilesToggleButton.title = "Hide 3D Pedestrian Network";
    } else {
      buttonText.textContent = "Show Pedestrian Network";
      this.pnTilesToggleButton.title = "Show 3D Pedestrian Network";
    }
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

    // Toggle button hover tooltip
    this.setupToggleTooltip();
  }

  setupToggleTooltip() {
    let tooltipTimeout;

    // Show tooltip on hover (only when sidebar is hidden)
    this.toggleButton.addEventListener("mouseenter", () => {
      if (!this.isVisible) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
          this.showToggleTooltip();
        }, 500); // 500ms delay before showing
      }
    });

    // Hide tooltip when leaving button or tooltip area
    this.toggleButton.addEventListener("mouseleave", () => {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(() => {
        this.hideToggleTooltip();
      }, 200); // Small delay to allow moving to tooltip
    });

    // Keep tooltip visible when hovering over it
    this.toggleTooltip.addEventListener("mouseenter", () => {
      clearTimeout(tooltipTimeout);
    });

    this.toggleTooltip.addEventListener("mouseleave", () => {
      this.hideToggleTooltip();
    });

    // Hide tooltip when clicking toggle button
    this.toggleButton.addEventListener("click", () => {
      this.hideToggleTooltip();
    });
  }

  showToggleTooltip() {
    if (this.isVisible) return; // Don't show when sidebar is visible

    const buttonRect = this.toggleButton.getBoundingClientRect();
    this.toggleTooltip.style.right = `${window.innerWidth - buttonRect.left + 10
      }px`;
    this.toggleTooltip.style.top = `${buttonRect.top}px`;
    this.toggleTooltip.classList.add("visible");
  }

  hideToggleTooltip() {
    this.toggleTooltip.classList.remove("visible");
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

      // NEW: Update CSS variable when resizing
      document.body.style.setProperty('--sidebar-width', `${newWidth}px`);


      // Update toggle button position if sidebar is visible
      if (this.isVisible) {
        this.updateTogglePosition();
      }


      // Save new width to persistence
      this.saveSidebarState();
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

    // NEW: Add class to body to trigger CSS rules
    document.body.classList.add('sidebar-open');
    this.saveSidebarState();
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove("visible");
    this.toggleButton.innerHTML = "◀"; // Arrow pointing left
    this.toggleButton.classList.remove("sidebar-open");
    this.toggleButton.style.right = "20px"; // Reset to default position

    // NEW: Remove class from body
    document.body.classList.remove('sidebar-open');
    this.saveSidebarState();
  }

  updateTogglePosition() {
    if (this.isVisible) {
      this.toggleButton.style.right = `${this.width + 30}px`;
    } else {
      this.toggleButton.style.right = "20px";
    }
  }

  // updateInfoBoxPosition() {
  //   if (!this.viewer || !this.viewer.infoBox) return;

  //   const infoBoxContainer = this.viewer.infoBox.container;
  //   if (!infoBoxContainer) return;

  //   if (this.isVisible) {
  //     // Position info box to the left of sidebar with some margin
  //     infoBoxContainer.style.right = `${this.width + 40}px`;
  //     infoBoxContainer.style.maxWidth = `${window.innerWidth - this.width - 80
  //       }px`;
  //   } else {
  //     // Reset to default positioning
  //     infoBoxContainer.style.right = "20px";
  //     infoBoxContainer.style.maxWidth = "";
  //   }
  // }

  setupInfoBoxMonitoring() {
    if (!this.viewer || !this.viewer.infoBox) return;

    // Override the info box show method to apply our positioning
    const originalShowInfo = this.viewer.infoBox._showInfo;

    this.viewer.infoBox._showInfo = (...args) => {
      const result = originalShowInfo.apply(this.viewer.infoBox, args);
      return result;
    };

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

    // Create items container with scrollable wrapper
    const itemsContainer = document.createElement("div");
    itemsContainer.className = "legend-items expanded";
    itemsContainer.id = `legend-items-${index}`;

    // Create scrollable content wrapper
    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "legend-scroll-wrapper";

    // Create fade indicators for scroll boundaries
    const topFade = document.createElement("div");
    topFade.className = "legend-scroll-fade top";
    const bottomFade = document.createElement("div");
    bottomFade.className = "legend-scroll-fade bottom";

    // Create scroll content area
    const scrollContent = document.createElement("div");
    scrollContent.className = "legend-scroll-content";

    // Add legend items to scroll content
    section.items.forEach((item) => {
      const itemElement = this.createLegendItem(item);
      scrollContent.appendChild(itemElement);
    });

    // Create content indicator
    const contentIndicator = document.createElement("div");
    contentIndicator.className = "legend-content-indicator";

    // Assemble scroll structure
    scrollWrapper.appendChild(topFade);
    scrollWrapper.appendChild(scrollContent);
    scrollWrapper.appendChild(bottomFade);
    itemsContainer.appendChild(scrollWrapper);
    itemsContainer.appendChild(contentIndicator);

    // Setup scroll functionality for this section
    this.setupSectionScrolling(
      scrollWrapper,
      scrollContent,
      topFade,
      bottomFade,
      contentIndicator,
      section
    );

    // Make header collapsible
    const toggleSection = () => {
      const isExpanded = itemsContainer.classList.contains("expanded");
      itemsContainer.classList.toggle("expanded");
      chevron.innerHTML = isExpanded ? "▶" : "▼";
      header.setAttribute("aria-expanded", (!isExpanded).toString());

      // Update scroll indicators when section is toggled
      setTimeout(() => {
        this.updateScrollIndicators(
          scrollWrapper,
          scrollContent,
          topFade,
          bottomFade,
          contentIndicator,
          section
        );
      }, 300); // Wait for animation to complete
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

  setupSectionScrolling(
    scrollWrapper,
    scrollContent,
    topFade,
    bottomFade,
    contentIndicator,
    section
  ) {
    // Update scroll indicators on scroll
    const updateIndicators = () => {
      this.updateScrollIndicators(
        scrollWrapper,
        scrollContent,
        topFade,
        bottomFade,
        contentIndicator,
        section
      );
    };

    // Smooth scrolling behavior
    scrollWrapper.addEventListener("scroll", () => {
      requestAnimationFrame(updateIndicators);
    });

    // Individual mouse wheel scrolling
    scrollWrapper.addEventListener("wheel", (e) => {
      e.stopPropagation(); // Prevent parent scrolling

      const scrollAmount = e.deltaY * 0.8; // Smooth scroll factor
      scrollWrapper.scrollTop += scrollAmount;
      e.preventDefault();
    });

    // Keyboard navigation within section
    scrollContent.addEventListener("keydown", (e) => {
      const items = scrollContent.querySelectorAll(".legend-item");
      const currentIndex = Array.from(items).findIndex(
        (item) =>
          item === document.activeElement ||
          item.contains(document.activeElement)
      );

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, items.length - 1);
          if (items[nextIndex]) {
            items[nextIndex].focus();
            this.scrollItemIntoView(scrollWrapper, items[nextIndex]);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (items[prevIndex]) {
            items[prevIndex].focus();
            this.scrollItemIntoView(scrollWrapper, items[prevIndex]);
          }
          break;
        case "Home":
          e.preventDefault();
          if (items[0]) {
            items[0].focus();
            scrollWrapper.scrollTop = 0;
          }
          break;
        case "End":
          e.preventDefault();
          if (items[items.length - 1]) {
            items[items.length - 1].focus();
            scrollWrapper.scrollTop = scrollWrapper.scrollHeight;
          }
          break;
      }
    });

    // Make legend items focusable for keyboard navigation
    const items = scrollContent.querySelectorAll(".legend-item");
    items.forEach((item, index) => {
      item.tabIndex = 0;
      item.setAttribute("role", "listitem");
      item.addEventListener("focus", () => {
        this.scrollItemIntoView(scrollWrapper, item);
      });
    });

    // Initial update
    setTimeout(() => updateIndicators(), 100);
  }

  updateScrollIndicators(
    scrollWrapper,
    scrollContent,
    topFade,
    bottomFade,
    contentIndicator,
    section
  ) {
    const scrollTop = scrollWrapper.scrollTop;
    const scrollHeight = scrollWrapper.scrollHeight;
    const clientHeight = scrollWrapper.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    // Show/hide fade indicators
    topFade.style.opacity = scrollTop > 10 ? "1" : "0";
    bottomFade.style.opacity = scrollTop < maxScroll - 10 ? "1" : "0";

    // Update content indicator
    const totalItems = section.items.length;
    const visibleItems = Math.floor((clientHeight / scrollHeight) * totalItems);
    const hiddenTop = Math.floor((scrollTop / scrollHeight) * totalItems);
    const hiddenBottom = totalItems - visibleItems - hiddenTop;

    let indicatorText = "";
    if (hiddenTop > 0 && hiddenBottom > 0) {
      indicatorText = `${hiddenTop} above, ${hiddenBottom} below`;
    } else if (hiddenTop > 0) {
      indicatorText = `${hiddenTop} more above`;
    } else if (hiddenBottom > 0) {
      indicatorText = `${hiddenBottom} more below`;
    }

    contentIndicator.textContent = indicatorText;
    contentIndicator.style.display = indicatorText ? "block" : "none";
  }

  scrollItemIntoView(scrollWrapper, item) {
    const wrapperRect = scrollWrapper.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < wrapperRect.top) {
      // Item is above visible area
      scrollWrapper.scrollTop -= wrapperRect.top - itemRect.top + 10;
    } else if (itemRect.bottom > wrapperRect.bottom) {
      // Item is below visible area
      scrollWrapper.scrollTop += itemRect.bottom - wrapperRect.bottom + 10;
    }
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

    Object.entries(unitStyles).forEach(([name, category]) => {
      const fillColor = category.fill;

      items.push({
        label: this.formatLabel(name),
        backgroundColor: this.colorToRgba(fillColor),
        borderColor: category.stroke
          ? this.colorToRgba(category.stroke)
          : "#666",
        shape: "square",
      });
    });

    return items;
  }

  getAmenityLegendItems() {
    const items = [];
    const amenityStyles = indoorStyles.amenity;

    Object.entries(amenityStyles).forEach(([name, amenity]) => {
      items.push({
        label: this.formatLabel(name),
        iconUrl: amenity.image,
        shape: "circle",
      });
    });

    return items;
  }

  getOccupantLegendItems() {
    const items = [];
    const occupantStyles = indoorStyles.occupant;

    Object.entries(occupantStyles).forEach(([name, occupant]) => {
      items.push({
        label: this.formatLabel(name),
        iconUrl: occupant.image,
        shape: "circle",
      });
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

  /**
   * Setup state management hooks for reactive updates
   */
  setupStateManagement() {
    // Listen for UI state changes (view mode, processing state)
    const uiStateCleanup = StateHooks.useUIState((uiState) => {
      this.onViewModeChanged(uiState.viewMode === "2D");
      this.updateProcessingState(uiState.isProcessing);
    });
    this.stateCleanups.push(uiStateCleanup);

    // Listen for building state changes
    const buildingStateCleanup = StateHooks.useBuildingState(
      (buildingState) => {
        this.updateBuildingAvailability(buildingState);
      }
    );
    this.stateCleanups.push(buildingStateCleanup);

    // Listen for wall visibility changes
    const wallStateCleanup = appState.subscribe(
      "wallsVisibilityChanged",
      (data) => {
        this.updateWallButtonState();
      }
    );
    this.stateCleanups.push(wallStateCleanup);

    // Listen for view mode changes to update wall button
    const viewModeCleanup = appState.subscribe("viewModeChanged", (data) => {
      this.updateWallButtonState();
    });
    this.stateCleanups.push(viewModeCleanup);

    // Subscribe to PNTiles visibility changes
    const pnTilesVisibilityCleanup = appState.subscribe(
      "tilesetVisibilityChanged",
      (data) => {
        if (data.tilesetId === "PNTiles") {
          this.updatePNTilesButtonState();
        }
      }
    );
    this.stateCleanups.push(pnTilesVisibilityCleanup);

    // Subscribe to tileset loading state changes
    const tilesetLoadingCleanup = appState.subscribe(
      "tilesetLoadingStateChanged",
      (data) => {
        if (data.tilesetId === "PNTiles") {
          this.updatePNTilesButtonState();
        }
      }
    );
    this.stateCleanups.push(tilesetLoadingCleanup);

    // Subscribe to tileset added events
    const tilesetAddedCleanup = appState.subscribe("tilesetAdded", (data) => {
      if (data.tilesetId === "PNTiles") {
        this.updatePNTilesButtonState();
      }
    });
    this.stateCleanups.push(tilesetAddedCleanup);

    console.log("[Sidebar] State management hooks initialized");
  }

  /**
   * React to view mode changes from AppState
   */
  onViewModeChanged(is2DMode) {
    if (!this.view2DButton) return;
   
    console.log(
      `[Sidebar] Reacting to view mode change: ${is2DMode ? "2D" : "3D"}`
    );

    if (is2DMode) {
      this.view2DButton.classList.add("active");
      this.view2DButton.innerHTML = `
        <span class="view-button-icon">🗺️</span>
        <span class="view-button-text">3D View</span>
      `;
      this.view2DButton.title = "Switch to 3D view";
      this.updateStatusIndicator("2D top view active");
    } else {
      this.view2DButton.classList.remove("active");
      this.view2DButton.innerHTML = `
        <span class="view-button-icon">📐</span>
        <span class="view-button-text">2D Top View</span>
      `;
      this.view2DButton.title = "Switch to 2D top-down view";

      // Check building availability from state
      const hasActiveBuilding = appState.getLastActiveVenueId() !== null;
      this.updateStatusIndicator(
        hasActiveBuilding
          ? "3D view active"
          : "Select a building to enable 2D view"
      );
    }

    // Update wall toggle button state for new view mode
    this.updateWallButtonState();

    // Update PNTiles button state
    this.updatePNTilesButtonState();
  }

  updateStatusIndicator(message) {
    const statusIndicator = this.viewControls?.querySelector(
      ".view-status-indicator"
    );
    if (statusIndicator) {
      statusIndicator.textContent = message;
    }
  }

  /**
   * Handle view mode toggle button click
   */
  handleViewModeToggle() {
    console.log("[Sidebar] View mode toggle button clicked");

    // Check if we have building context for 2D mode
    const buildingState = {
      lastActiveVenueId: appState.getLastActiveVenueId(),
      hasActiveBuildings: appState.getAllActiveBuildings().size > 0,
    };

    if (appState.getViewMode() === "3D" && !buildingState.lastActiveVenueId) {
      console.warn("[Sidebar] No building selected for 2D view");
      this.showNoListingMessage();
      return;
    }

    // Use StateActions to toggle view mode - this will trigger reactive updates
    console.log("[Sidebar] Toggling view mode via StateActions");
    StateActions.toggleViewMode();
  }

  /**
   * Show message when no building is selected
   */
  showNoListingMessage() {
    // // Show notification system message
    // notificationSystem.buildingRequired();

    // Update status indicator to show the user needs to select a building
    this.updateStatusIndicator(
      "Please select a building first to enable 2D view"
    );

    // Add temporary highlight effect
    if (this.view2DButton) {
      this.view2DButton.classList.add("attention");
      setTimeout(() => {
        this.view2DButton.classList.remove("attention");
      }, 2000);
    }
  }

  /**
   * Update building availability based on state changes
   */
  updateBuildingAvailability(buildingState) {
    const { lastActiveVenueId, count } = buildingState;
    const hasActiveBuilding = lastActiveVenueId !== null && count > 0;

    if (!this.view2DButton) return;

    // Update button availability
    this.view2DButton.disabled = !hasActiveBuilding;

    // Update building instance reference for wall button
    this.buildingInstance = hasActiveBuilding
      ? appState.getActiveBuilding(lastActiveVenueId)
      : null;

    // Update status indicator based on current view mode and building availability
    const currentViewMode = appState.getViewMode();
    if (currentViewMode === "2D") {
      this.updateStatusIndicator("2D top view active");
    } else {
      this.updateStatusIndicator(
        hasActiveBuilding
          ? "Building loaded - 2D view available"
          : "Select a building to enable 2D view"
      );
    }

    // Update wall toggle button state
    this.updateWallButtonState();

    // Update PNTiles button state
    this.updatePNTilesButtonState();

    console.log(
      `[Sidebar] Building availability updated: ${hasActiveBuilding}`
    );
  }

  /**
   * Update processing state (for loading indicators)
   */
  updateProcessingState(isProcessing) {
    if (!this.view2DButton) return;

    if (isProcessing) {
      this.view2DButton.disabled = true;
      this.view2DButton.classList.add("processing");
    } else {
      // Re-enable based on building availability
      const hasActiveBuilding = appState.getLastActiveVenueId() !== null;
      this.view2DButton.disabled = !hasActiveBuilding;
      this.view2DButton.classList.remove("processing");
    }
  }

  /**
   * Save current sidebar state to persistence
   */
  saveSidebarState() {
    persistenceService.saveSidebarState(this.isVisible, this.width);
  }


  /**
   * Restore sidebar state from persistence
   */
  restoreSidebarState() {
    const sidebarState = persistenceService.loadSidebarState();
    if (sidebarState) {
      console.log("[Sidebar] Restoring sidebar state from persistence");

      // Restore width
      if (
        sidebarState.width &&
        sidebarState.width >= this.minWidth &&
        sidebarState.width <= this.maxWidth
      ) {
        this.width = sidebarState.width;
        this.container.style.width = `${this.width}px`;
      }

      // Restore visibility
      if (sidebarState.isVisible) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.show();
        }, 100);
      }
    }
  }

  // Legacy methods for backward compatibility (now use state management)
  setBuildingContext(buildingIndoor, venueId) {
    console.log(
      `[Sidebar] setBuildingContext called (legacy) - using state management instead`
    );
    // The ViewControllerManager will handle this via state
  }

  clearBuildingContext() {
    console.log(
      `[Sidebar] clearBuildingContext called (legacy) - using state management instead`
    );
    // The ViewControllerManager will handle this via state
  }

  // Public methods for external control
  refresh() {
    this.createLegend();
  }

  destroy() {
    // Clean up state management hooks
    this.stateCleanups.forEach((cleanup) => cleanup());
    this.stateCleanups = [];

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
    }
    if (this.toggleTooltip && this.toggleTooltip.parentNode) {
      this.toggleTooltip.parentNode.removeChild(this.toggleTooltip);
    }


    console.log("[Sidebar] Destroyed and cleaned up state listeners");
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

