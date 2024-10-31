/**
 * Database configuration module
 * Provides centralized database connection pool
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * MySQL connection pool configuration
 * Uses environment variables for secure database access
 * Provides connection pooling for efficient resource usage
 * 
 * Configuration parameters:
 * - host: Database server hostname
 * - user: Database user
 * - password: Database password
 * - database: Database name
 * - waitForConnections: Whether to queue connections when pool is full
 * - connectionLimit: Maximum number of connections in pool
 * - queueLimit: Maximum number of connection requests to queue
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;