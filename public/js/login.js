// public/js/login.js

const API_BASE_URL =
  window.location.port === "3001" ? "http://localhost:3001" : "";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;
  let csrfToken = null;

  // Fetch CSRF token on page load
  fetch(`${API_BASE_URL}/api/account/csrf-token`, {
    credentials: "same-origin",
  })
    .then((res) => res.json())
    .then((data) => {
      csrfToken = data.csrfToken;
    });

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const userName = document.getElementById("userName").value;
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("errorMsg");
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
        body: JSON.stringify({ userName, password }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = "/";
      } else {
        errorMsg.textContent = data.error || "Login failed";
        errorMsg.style.display = "block";
      }
    } catch (err) {
      errorMsg.textContent = "Network error";
      errorMsg.style.display = "block";
    }
  });
});
