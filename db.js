/**
 * MySQL connection pool (XAMPP compatible)
 * Uses mysql2 with promise support.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_irrigation_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: false
});

/**
 * Test the database connection.
 * @returns {Promise<{ok: boolean, message: string, error?: string}>}
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return { ok: true, message: 'Database connection successful' };
  } catch (err) {
    return {
      ok: false,
      message: 'Database connection failed',
      error: err.code || err.message
    };
  }
}

module.exports = { pool, testConnection };
