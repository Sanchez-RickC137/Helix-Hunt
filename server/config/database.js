const mysql = require('mysql2/promise');
const { createReadStream } = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Initialize connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  ssl: {
    rejectUnauthorized: false
  },
  debug: true // Temporarily enable for debugging
});

// Test and configure pool
const initializePool = async () => {
  try {
    const connection = await pool.getConnection();
    // await connection.query('SET GLOBAL local_infile = 1');
    // console.log('LOCAL INFILE enabled');
    connection.release();
    
    console.log('Successfully connected to the database.'); 
    return pool;
  } catch (error) {
    console.error('Error configuring pool:', error);
    throw error;
  }
};

/**
 * Create indexing to optimize database query returns. Indexes are created after tables exist
 * @param {*} connection 
 */
const createOptimizedIndexes = async (connection) => {
  try {
    // Use CREATE INDEX without IF NOT EXISTS (not supported in older MySQL versions)
    await connection.query(`
      CREATE INDEX idx_variant_summary_name ON variant_summary(Name(255))
    `).catch(err => {
      // Ignore error if index already exists
      if (!err.message.includes('Duplicate')) {
        console.warn('Warning: Could not create variant_summary name index:', err.message);
      }
    });
    
    console.log('Created/verified database indexes');
  } catch (error) {
    console.warn('Warning: Error creating indexes:', error);
  }
};

module.exports = {
  pool,
  initializePool,
  createOptimizedIndexes
};