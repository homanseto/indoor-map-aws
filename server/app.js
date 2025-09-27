import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import jwt from "jsonwebtoken";
import testRouter from "./routes/testing.js";
import adminRouter from "./routes/admin.js";
import loginRouter from "./routes/login.js";
import smo3dmRouter from "./routes/smo3dm.js";
import { MongoClient } from "mongodb";
import { Pool } from "pg";
import csurf from "csurf";

// Load environment variables from .env in development
if (process.env.NODE_ENV !== "production") {
  const dotenv = await import("dotenv");
  dotenv.config();
}

const app = express();

// Serve static files from public directory
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/", requireAuth, (req, res) => {
  res.sendFile(path.resolve("public/indoor-viewer.html"));
});

app.get("/indoor-viewer.html", requireAuth, (req, res) => {
  res.sendFile(path.resolve("public/indoor-viewer.html"));
});

app.use(express.static(path.resolve("public")));

// // Before mounting routes
const csrfProtection = csurf({ cookie: true });

app.use((req, res, next) => {
  // Skip CSRF(Cross-Site Request Forgery) for initial admin creation and external-protected and CSRF will not check get requests
  if (
    req.path === "/api/admin/create-initial-admin" ||
    req.path === "/api/smo3dm/external-protected"
  ) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// CSRF token endpoint for frontend (must be after CSRF middleware)
app.get("/api/account/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Mount API routes
app.use("/api/smo3dm", smo3dmRouter);
app.use("/api/test", testRouter);
app.use("/api/admin", adminRouter);
app.use("/api/account", loginRouter);

// Middleware to check authentication for protected pages
function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.redirect("/login.html");
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.redirect("/login.html");
  }
}

// Optional: expose CSRF token to frontend (for forms/AJAX)
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    // CSRF token errors
    res.status(403).json({ error: "Invalid CSRF token" });
  } else {
    next(err);
  }
});

export default app;
