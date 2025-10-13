import { Pool } from "pg";

const pool = new Pool({
  host: process.env.POSTGIS_HOST,
  port: process.env.POSTGIS_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

export default pool;
