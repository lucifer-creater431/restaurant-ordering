const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1', // IPv6 connection issue se bachne ke liye 127.0.0.1
  database: process.env.DB_NAME || 'restaurant_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

module.exports = pool;