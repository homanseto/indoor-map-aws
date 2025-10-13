// public/js/login.js

const API_BASE_URL =
  window.location.port === "3001" ? "http://localhost:3001" : "";

// login.js: Attach login logic after modal is injected
console.log("[login.js] Loaded.");
const loginForm = document.getElementById("loginForm");
if (!loginForm) {
  console.error("[login.js] loginForm not found!");
} else {
  console.log("[login.js] loginForm found.");
  let csrfToken = null;
  const csrfInput = document.getElementById("csrfTokenInput");
  const loginButton = loginForm.querySelector('button[type="submit"]');
  loginButton.disabled = true;

  // Fetch CSRF token on modal load
  console.log("[login.js] Fetching CSRF token...");
  fetch(`${API_BASE_URL}/api/account/csrf-token`, {
    credentials: "same-origin",
  })
    .then((res) => res.json())
    .then((data) => {
      csrfToken = data.csrfToken;
      csrfInput.value = csrfToken;
      loginButton.disabled = false;
      console.log("[login.js] CSRF token fetched:", csrfToken);
    })
    .catch((err) => {
      console.error("[login.js] Failed to fetch CSRF token:", err);
    });

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const errorMsg = document.getElementById("errorMsg");
    if (!csrfInput.value) {
      errorMsg.textContent = "CSRF token missing. Please reload.";
      errorMsg.style.display = "block";
      return;
    }
    const username = document.getElementById("userName").value;
    const password = document.getElementById("password").value;
    errorMsg.style.display = "none";
    try {
      if (!csrfToken) {
        errorMsg.textContent =
          "CSRF token not loaded. Please refresh and try again.";
        errorMsg.style.display = "block";
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/account/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ username, password }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok) {
        // Remove login modal
        const modal = document.getElementById("loginModalMount");
        if (modal) modal.remove();
        // Trigger main app load and fly-to
        if (window.onLoginSuccess) window.onLoginSuccess();
      } else {
        errorMsg.textContent = data.error || "Login failed";
        errorMsg.style.display = "block";
      }
    } catch (err) {
      errorMsg.textContent = "Network error";
      errorMsg.style.display = "block";
    }
  });
}
