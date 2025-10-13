// public/js/indoor-viewer-init.js
// Handles login modal injection and app bootstrapping for indoor-viewer.html

// Load Cesium basemap immediately
import("./cesium-basemap-only.js");

// Helper to check if user is logged in (by calling backend)
async function isLoggedIn() {
  try {
    const res = await fetch("/api/account/status", {
      credentials: "same-origin",
    });
    const data = await res.json();
    return data.loggedIn;
  } catch {
    return false;
  }
}

(async () => {
  if (await isLoggedIn()) {
    // User is already logged in, load main app directly
    console.log(
      "[indoor-viewer-init] User already logged in, skipping login modal."
    );
    const main = await import("./demo-main-server.js");
    if (typeof main.initDemo === "function") {
      main.initDemo();
    }
  } else {
    // Inject login modal HTML on page load
    const mount = document.createElement("div");
    mount.id = "loginModalMount";
    document.body.appendChild(mount);

    fetch("./html/login-modal.html")
      .then((res) => res.text())
      .then((html) => {
        mount.innerHTML = html;
        console.log("[indoor-viewer-init] Login modal injected.");
        // Dynamically load login.js logic after modal is present
        import("./login.js").then(() => {
          console.log("[indoor-viewer-init] login.js loaded after modal.");
          // Only initialize the app after successful login
          window.onLoginSuccess = async function () {
            // Dynamically import and run the main app
            const main = await import("./demo-main-server.js");
            if (typeof main.initDemo === "function") {
              main.initDemo();
            }
          };
        });
      });
  }
})();
