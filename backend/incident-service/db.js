const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
});

const authPool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.AUTH_DB_NAME || process.env.DB_NAME
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  authQuery: (text, params) => authPool.query(text, params),
  pool,
  authPool
};