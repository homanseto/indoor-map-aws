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

// POST /api/account/login
router.post("/login", async (req, res) => {
  const { userName, password } = req.body;
  if (!userName || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const result = await pgPool.query(
      "SELECT * FROM userinformation WHERE userName = $1",
      [userName]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Update last_login timestamp
    await pgPool.query(
      "UPDATE userinformation SET last_login = NOW() WHERE id = $1",
      [user.id]
    );
    // Create JWT
    const token = jwt.sign(
      { id: user.id, userName: user.userName, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      //   secure: process.env.NODE_ENV === "production", ///add this after we have SSL certificate
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1day
    });
    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
