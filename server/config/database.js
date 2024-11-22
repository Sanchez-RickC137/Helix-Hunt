const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Initialize connection pool with Hostinger-specific settings
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
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: {
    rejectUnauthorized: false
  },
  debug: process.env.NODE_ENV !== 'production'
});

// Initialize pool with retry mechanism
const initializePool = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection();
      
      // Test the connection
      await connection.query('SELECT 1');
      
      connection.release();
      console.log('Successfully connected to the database.');
      return pool;
    } catch (error) {
      console.error(`Connection attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        throw new Error(`Failed to connect after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before next attempt (increasing delay)
      await new Promise(resolve => setTimeout(resolve, attempt * 5000));
    }
  }
};

const createOptimizedIndexes = async (connection) => {
  try {
    // First check if index exists
    const [indexes] = await connection.query(`
      SHOW INDEX FROM variant_summary 
      WHERE Key_name = 'idx_variant_summary_name'
    `);

    if (indexes.length === 0) {
      await connection.query(`
        CREATE INDEX idx_variant_summary_name ON variant_summary(Name(255))
      `);
      console.log('Created variant_summary name index');
    } else {
      console.log('variant_summary name index already exists');
    }

    console.log('Database indexes verification completed');
  } catch (error) {
    console.warn('Warning: Error managing indexes:', error);
    // Don't throw error as indexes are optimizations, not critical functionality
  }
};

// Export pool maintainer
const maintainPool = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
  } catch (error) {
    console.error('Pool maintenance check failed:', error);
    // Attempt to re-initialize pool
    try {
      await initializePool(3);
    } catch (reinitError) {
      console.error('Failed to re-initialize pool:', reinitError);
    }
  }
};

// Set up periodic pool maintenance
if (process.env.NODE_ENV === 'production') {
  setInterval(maintainPool, 60000); // Check every minute
}

module.exports = {
  pool,
  initializePool,
  createOptimizedIndexes
};