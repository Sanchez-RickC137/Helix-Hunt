/**
 * Database migration script
 * Sets up and maintains database schema
 * Creates necessary tables if they don't exist
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database connection pool configuration
 * Uses environment variables for secure configuration
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

/**
 * Array of migration queries
 * Each query creates a table if it doesn't exist
 * Maintains referential integrity with foreign keys
 */
const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Query history table
  `CREATE TABLE IF NOT EXISTS query_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    query JSON NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // User preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    full_name_preferences JSON,
    variation_id_preferences JSON,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`
];

/**
 * Runs all migration queries in sequence
 * Logs success or failure for each migration
 * 
 * @returns {Promise<void>}
 */
async function runMigrations() {
  for (const migration of migrations) {
    try {
      await pool.query(migration);
      console.log('Migration successful:', migration.substring(0, 50) + '...');
    } catch (error) {
      console.error('Migration failed:', migration.substring(0, 50) + '...');
      console.error(error);
    }
  }
}

// Execute migrations and handle completion
runMigrations().then(() => {
  console.log('All migrations completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration process failed:', error);
  process.exit(1);
});