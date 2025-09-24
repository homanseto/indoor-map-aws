import { Router } from "express";
const router = Router();

// GET /api/users
router.get("/", (req, res) => {
  res.json({ message: "User list (API response)" });
});

export default router;
