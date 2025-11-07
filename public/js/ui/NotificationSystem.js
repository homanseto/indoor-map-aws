/**
 * Notification System
 *
 * Provides visual feedback for user actions including:
 * - View mode switching (2D/3D)
 * - Loading states
 * - Error messages
 * - Success confirmations
 */

export class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = new Map(); // Track active notifications
    this.nextId = 1;
    this.defaultDuration = 3000; // 3 seconds

    this.init();
  }

  /**
   * Initialize notification system
   */
  init() {
    this.createContainer();
    this.setupStyles();
    console.log("[NotificationSystem] Initialized");
  }

  /**
   * Create notification container
   */
  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "notification-container";
    this.container.className = "notification-container";
    document.body.appendChild(this.container);
  }

  /**
   * Setup notification styles
   */
  setupStyles() {
    // Check if styles already exist
    if (document.getElementById("notification-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 10001;
        pointer-events: none;
        max-width: 350px;
      }

      .notification {
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 16px;
        margin-bottom: 8px;
        border-radius: 6px;
        border-left: 4px solid #007acc;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        pointer-events: auto;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }

      .notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .notification.success {
        border-left-color: #28a745;
        background: rgba(40, 167, 69, 0.1);
        backdrop-filter: blur(10px);
      }

      .notification.error {
        border-left-color: #dc3545;
        background: rgba(220, 53, 69, 0.1);
        backdrop-filter: blur(10px);
      }

      .notification.warning {
        border-left-color: #ffc107;
        background: rgba(255, 193, 7, 0.1);
        backdrop-filter: blur(10px);
      }

      .notification.info {
        border-left-color: #17a2b8;
        background: rgba(23, 162, 184, 0.1);
        backdrop-filter: blur(10px);
      }

      .notification.loading {
        border-left-color: #6c757d;
        background: rgba(108, 117, 125, 0.1);
        backdrop-filter: blur(10px);
      }

      .notification-icon {
        flex-shrink: 0;
        font-size: 18px;
        width: 20px;
        text-align: center;
      }

      .notification-content {
        flex: 1;
      }

      .notification-title {
        font-weight: 600;
        margin-bottom: 2px;
      }

      .notification-message {
        font-size: 13px;
        opacity: 0.9;
      }

      .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        margin: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
        font-size: 16px;
        opacity: 0.7;
      }

      .notification-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
        opacity: 1;
      }

      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 6px 6px;
        transition: width linear;
      }

      .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 480px) {
        .notification-container {
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show notification
   */
  show(options = {}) {
    const {
      type = "info",
      title = "",
      message = "",
      duration = this.defaultDuration,
      closable = true,
      icon = null,
    } = options;

    const id = this.nextId++;
    const notification = this.createNotification(
      id,
      type,
      title,
      message,
      closable,
      icon
    );

    this.notifications.set(id, notification);
    this.container.appendChild(notification.element);

    // Show notification with animation
    requestAnimationFrame(() => {
      notification.element.classList.add("show");
    });

    // Auto-remove after duration (unless it's a loading notification)
    if (duration > 0 && type !== "loading") {
      notification.progressTimer = this.startProgressTimer(
        notification.element,
        duration
      );
      notification.timer = setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    return id;
  }

  /**
   * Create notification element
   */
  createNotification(id, type, title, message, closable, customIcon) {
    const element = document.createElement("div");
    element.className = `notification ${type}`;
    element.setAttribute("data-id", id);

    // Get icon based on type
    let icon = customIcon;
    if (!icon) {
      const icons = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        loading: null, // Will use spinner
      };
      icon = icons[type] || "ℹ️";
    }

    // Build content
    let iconHtml = "";
    if (type === "loading") {
      iconHtml = '<div class="loading-spinner"></div>';
    } else if (icon) {
      iconHtml = `<div class="notification-icon">${icon}</div>`;
    }

    let contentHtml = "";
    if (title) {
      contentHtml += `<div class="notification-title">${title}</div>`;
    }
    if (message) {
      contentHtml += `<div class="notification-message">${message}</div>`;
    }

    let closeButton = "";
    if (closable) {
      closeButton =
        '<button class="notification-close" aria-label="Close">×</button>';
    }

    element.innerHTML = `
      ${iconHtml}
      <div class="notification-content">
        ${contentHtml}
      </div>
      ${closeButton}
      ${type !== "loading" ? '<div class="notification-progress"></div>' : ""}
    `;

    // Setup close button
    if (closable) {
      const closeBtn = element.querySelector(".notification-close");
      closeBtn.addEventListener("click", () => this.hide(id));
    }

    return {
      element,
      type,
      timer: null,
      progressTimer: null,
    };
  }

  /**
   * Start progress timer animation
   */
  startProgressTimer(element, duration) {
    const progress = element.querySelector(".notification-progress");
    if (!progress) return null;

    progress.style.width = "100%";
    progress.style.transition = `width ${duration}ms linear`;

    requestAnimationFrame(() => {
      progress.style.width = "0%";
    });

    return progress;
  }

  /**
   * Hide notification
   */
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Clear timers
    if (notification.timer) {
      clearTimeout(notification.timer);
    }

    // Animate out
    notification.element.classList.remove("show");

    // Remove from DOM after animation
    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Update existing notification (useful for loading states)
   */
  update(id, options = {}) {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    const { type, title, message, duration = this.defaultDuration } = options;

    // Update type if provided
    if (type && type !== notification.type) {
      notification.element.className = `notification ${type}`;
      notification.type = type;
    }

    // Update content
    const titleElement = notification.element.querySelector(
      ".notification-title"
    );
    const messageElement = notification.element.querySelector(
      ".notification-message"
    );
    const iconElement =
      notification.element.querySelector(".notification-icon");

    if (title !== undefined && titleElement) {
      titleElement.textContent = title;
    }
    if (message !== undefined && messageElement) {
      messageElement.textContent = message;
    }

    // Update icon if type changed
    if (type && iconElement) {
      const icons = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️",
        loading: null,
      };
      const newIcon = icons[type];
      if (newIcon) {
        iconElement.textContent = newIcon;
      }
    }

    // Handle loading -> success/error transition
    if (notification.type !== "loading" && duration > 0) {
      // Clear existing timer
      if (notification.timer) {
        clearTimeout(notification.timer);
      }

      // Start new timer
      notification.progressTimer = this.startProgressTimer(
        notification.element,
        duration
      );
      notification.timer = setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    return true;
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach((notification, id) => {
      this.hide(id);
    });
  }

  /**
   * Convenience methods for different notification types
   */
  success(title, message = "", duration = 3000) {
    return this.show({ type: "success", title, message, duration });
  }

  error(title, message = "", duration = 5000) {
    return this.show({ type: "error", title, message, duration });
  }

  warning(title, message = "", duration = 4000) {
    return this.show({ type: "warning", title, message, duration });
  }

  info(title, message = "", duration = 3000) {
    return this.show({ type: "info", title, message, duration });
  }

  loading(title, message = "") {
    return this.show({
      type: "loading",
      title,
      message,
      duration: 0,
      closable: false,
    });
  }

  /**
   * View mode specific notifications
   */
  viewModeSwitch(mode, buildingName = "") {
    const modeText = mode === "2D" ? "2D Top View" : "3D View";
    const icon = mode === "2D" ? "📐" : "🗺️";
    const building = buildingName ? ` - ${buildingName}` : "";

    return this.show({
      type: "success",
      title: `Switched to ${modeText}`,
      message: `View mode changed successfully${building}`,
      icon,
      duration: 2500,
    });
  }

  viewModeSwitchLoading(targetMode) {
    const modeText = targetMode === "2D" ? "2D Top View" : "3D View";
    return this.loading(
      `Switching to ${modeText}`,
      "Updating camera position..."
    );
  }

  viewModeSwitchError(targetMode, error = "") {
    const modeText = targetMode === "2D" ? "2D Top View" : "3D View";
    return this.error(
      `Failed to switch to ${modeText}`,
      error || "Please try again or check building selection"
    );
  }

  buildingRequired() {
    return this.warning(
      "Building Required",
      "Please select a building first to enable 2D view"
    );
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.clearAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    const styles = document.getElementById("notification-styles");
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
  }
}

// Create singleton instance
export const notificationSystem = new NotificationSystem();

// Make available globally for debugging
if (typeof window !== "undefined") {
  window.notificationSystem = notificationSystem;
}
