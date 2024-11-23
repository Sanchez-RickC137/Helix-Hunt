const { Pool } = require('pg');
const dotenv = require('dotenv');


dotenv.config();

// Configure SSL based on environment
const sslConfig = process.env.NODE_ENV === 'production' 
  ? {
      ssl: {
        rejectUnauthorized: false // Required for some hosting providers
      }
    }
  : {};

// Create the connection pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ...sslConfig,
//   max: 20, // Maximum number of clients in the pool
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
//   maxUses: 7500, // Close client after this many uses to prevent memory issues
// });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432, // Default to PostgreSQL's port
  ...sslConfig
});

// Pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize pool
const initializePool = async () => {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
    client.release();
    return pool;
  } catch (error) {
    console.error('Error configuring pool:', error);
    throw error;
  }
};

/**
 * Create optimized indexes for PostgreSQL
 * @param {PoolClient} client - PostgreSQL client
 */
const createOptimizedIndexes = async (client) => {
  try {
    // Create GiST index for faster text pattern matching
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_variant_summary_name_gist ON variant_summary 
      USING gist (Name gist_trgm_ops);
    `).catch(err => {
      if (!err.message.includes('already exists')) {
        console.warn('Warning: Could not create GiST index:', err.message);
      }
    });

    // Create B-tree indexes for exact matching
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_gene_symbol ON variant_summary(GeneSymbol);
      CREATE INDEX IF NOT EXISTS idx_variation_id ON variant_summary(VariationID);
    `).catch(err => {
      if (!err.message.includes('already exists')) {
        console.warn('Warning: Could not create B-tree indexes:', err.message);
      }
    });

    console.log('Created/verified database indexes');
  } catch (error) {
    console.warn('Warning: Error creating indexes:', error);
  }
};

// Helper function for parameterized queries
const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
  initializePool,
  createOptimizedIndexes
};