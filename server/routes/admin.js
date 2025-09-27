import express from "express";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const router = express.Router();

const pgPool = new Pool({
  host: process.env.POSTGIS_HOST,
  port: process.env.POSTGIS_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

// POST /api/admin/create-user
router.post("/create-user", adminOnly, async (req, res) => {
  const { userName, password, role } = req.body;
  if (!userName || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // Password complexity check (example: min 8 chars, 1 number, 1 special char)
  const pwRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
  if (!pwRegex.test(password)) {
    return res.status(400).json({ error: "Password too weak" });
  }
  try {
    // Check for duplicate userName
    const existing = await pgPool.query(
      "SELECT 1 FROM userinformation WHERE userName = $1",
      [userName]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    await pgPool.query(
      "INSERT INTO userinformation (userName, password, role) VALUES ($1, $2, $3)",
      [userName, hash, role]
    );
    res.json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: Only allow admin users (assumes JWT auth, adjust as needed)
function adminOnly(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// TEMPORARY: Unprotected endpoint to create the first admin account
// IMPORTANT: Remove or comment out after first use for security!
router.post("/create-initial-admin", async (req, res) => {
  const { userName, password, role } = req.body;
  if (!userName || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // Password complexity check (same as API)
  const pwRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
  if (!pwRegex.test(password)) {
    return res.status(400).json({ error: "Password too weak" });
  }
  try {
    // Check for duplicate userName
    const existing = await pgPool.query(
      "SELECT 1 FROM userinformation WHERE userName = $1",
      [userName]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    await pgPool.query(
      "INSERT INTO userinformation (userName, password, role) VALUES ($1, $2, $3)",
      [userName, hash, role]
    );
    res.json({ message: "Initial admin user created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
