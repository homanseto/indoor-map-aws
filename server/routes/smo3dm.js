import express from "express";
import { MongoClient } from "mongodb";
import { Pool } from "pg";

import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();
// Example protected POST endpoint
router.post("/external-protected", apiKeyAuth, (req, res) => {
  // Only requests with valid API key reach here
  res.json({ message: "API key authentication successful!" });
});

export default router;
