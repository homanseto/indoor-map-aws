import express from "express";
import bcrypt from "bcrypt";
import { PostgisService } from "../dbServices/PostgisService.js";
import jwt from "jsonwebtoken";
import { POSTGIS_TABLE } from "../../config/postgistable.js";

const router = express.Router();

const postgisService = new PostgisService();

// GET /api/account/status - check if user is logged in (valid JWT)

router.get("/status", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ loggedIn: false });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ loggedIn: true });
  } catch {
    res.json({ loggedIn: false });
  }
});
// POST /api/account/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    // Use parameterized query to avoid SQL injection
    const sql = `SELECT * FROM ${POSTGIS_TABLE.USERINFORMATION} WHERE userName = $1`;
    const result = await postgisService.query(sql, [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // Update last_login timestamp
    // Use parameterized query to avoid SQL injection
    const updateSql = `UPDATE ${POSTGIS_TABLE.USERINFORMATION} SET last_login = NOW() WHERE id = $1`;
    await postgisService.query(updateSql, [user.id]);
    // Create JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
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
