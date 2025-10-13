import pool from "./pgPool.js";

export class PostgisService {
  constructor() {}

  async query(sql, params) {
    return pool.query(sql, params);
  }

  async findOne(table, whereClause = "", params = []) {
    const sql = `SELECT * FROM ${table} ${whereClause} LIMIT 1;`;
    const { rows } = await pool.query(sql, params);
    return rows[0] || null;
  }

  // Add more methods as needed (insert, update, delete, transactions, etc.)
}
