const { pool } = require('./database');

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // File updates table
  `CREATE TABLE IF NOT EXISTS file_updates (
    file_name VARCHAR(255) PRIMARY KEY,
    last_upload_datetime TIMESTAMP,
    file_modified_datetime TIMESTAMP,
    last_check_datetime TIMESTAMP
  )`,

  // Password reset codes table
  `CREATE TABLE IF NOT EXISTS password_reset_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
  )`,

  // Query history table
  `CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    full_names JSONB,
    variation_ids JSONB,
    clinical_significance JSONB,
    start_date DATE,
    end_date DATE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_type VARCHAR(255) CHECK (search_type IN ('targeted', 'general')) DEFAULT 'targeted',
    search_groups JSONB,
    query_source VARCHAR(255) CHECK (query_source IN ('web', 'database')) DEFAULT 'web'
  )`,

  // User preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    full_name_preferences JSONB DEFAULT '[]',
    variation_id_preferences JSONB DEFAULT '[]'
  )`,

  // Gene variant counts table
  `CREATE TABLE IF NOT EXISTS gene_variant_counts (
    gene_symbol VARCHAR(255) PRIMARY KEY,
    variant_count INTEGER NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Component parts table
  `CREATE TABLE IF NOT EXISTS component_parts (
    variation_id VARCHAR(255) PRIMARY KEY,
    gene_symbol VARCHAR(255),
    transcript_id VARCHAR(255),
    dna_change TEXT,
    protein_change TEXT
  )`,

  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_gene_symbol_comp ON component_parts(gene_symbol);
   CREATE INDEX IF NOT EXISTS idx_transcript_id ON component_parts(transcript_id);
   CREATE INDEX IF NOT EXISTS idx_dna_change ON component_parts(dna_change);
   CREATE INDEX IF NOT EXISTS idx_protein_change ON component_parts(protein_change);`,

  // Create extension for text search
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const migration of migrations) {
      try {
        await client.query(migration);
        console.log('Migration successful:', migration.substring(0, 50) + '...');
      } catch (error) {
        console.error('Migration failed:', migration.substring(0, 50) + '...');
        console.error(error);
        throw error;
      }
    }

    await client.query('COMMIT');
    console.log('All migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration process failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };