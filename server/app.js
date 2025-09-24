import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import usersRouter from "./routes/users.js";
import indexRouter from "./routes/index.js";
import { MongoClient } from "mongodb";
import { Pool } from "pg";

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

app.use(express.static(path.resolve("public")));

// Mount API routes
app.use("/api/users", usersRouter);
app.use("/api/test", indexRouter);

// Serve indoor-viewer.html at root
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/indoor-viewer.html"));
});

export default app;
