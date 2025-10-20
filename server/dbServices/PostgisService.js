import pool from "./pgPool.js";
import fs from "fs/promises";

export class PostgisService {
  constructor() {
    this.defaultBatchSize = 50; // Configurable batch size
  }

  async query(sql, params) {
    return pool.query(sql, params);
  }

  async findOne(table, whereClause = "", params = []) {
    const sql = `SELECT * FROM ${table} ${whereClause} LIMIT 1;`;
    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
  }

  async deleteOne(table, whereClause = "", params = []) {
    const sql = `DELETE FROM ${table} ${whereClause} RETURNING *;`;
    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
  }

  /**
   * Test database connectivity and PostGIS functionality
   */
  async testConnection() {
    try {
      const result = await this.query("SELECT PostGIS_Version() as version");
      console.log("✅ PostGIS connection successful:", result.rows[0].version);
      return true;
    } catch (error) {
      console.error("❌ PostGIS connection failed:", error);
      return false;
    }
  }
}
