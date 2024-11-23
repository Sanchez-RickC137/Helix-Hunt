require('dotenv').config();
const { Pool } = require('pg');

const sslConfig = process.env.NODE_ENV === 'production' 
  ? { ssl: { rejectUnauthorized: false } } 
  : {};

const pool = new Pool({
  connectionString: process.env.EXTERNAL_DATABASE_URL,
  ...sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS query_chunks (
    id SERIAL PRIMARY KEY,
    query_id TEXT NOT NULL,
    chunk_number INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '1 day'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_query_chunks ON query_chunks(query_id, chunk_number)`,

  `CREATE TABLE IF NOT EXISTS processing_status (
    id TEXT PRIMARY KEY,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS variant_summary (
    AlleleID TEXT,
    Type TEXT,
    Name TEXT,
    GeneID TEXT,
    GeneSymbol TEXT,
    HGNC_ID TEXT,
    ClinicalSignificance TEXT,
    ClinSigSimple TEXT,
    LastEvaluated TEXT,
    RS_dbSNP TEXT,
    nsv_esv_dbVar TEXT,
    RCVaccession TEXT,
    PhenotypeIDS TEXT,
    PhenotypeList TEXT,
    Origin TEXT,
    OriginSimple TEXT,
    Assembly TEXT,
    ChromosomeAccession TEXT,
    Chromosome TEXT,
    Start TEXT,
    Stop TEXT,
    ReferenceAllele TEXT,
    AlternateAllele TEXT,
    Cytogenetic TEXT,
    ReviewStatus TEXT,
    NumberSubmitters TEXT,
    Guidelines TEXT,
    TestedInGTR TEXT,
    OtherIDs TEXT,
    SubmitterCategories TEXT,
    VariationID TEXT,
    PositionVCF TEXT,
    ReferenceAlleleVCF TEXT,
    AlternateAlleleVCF TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS submission_summary (
    VariationID TEXT,
    ClinicalSignificance TEXT,
    DateLastEvaluated TEXT,
    Description TEXT,
    SubmittedPhenotypeInfo TEXT,
    ReportedPhenotypeInfo TEXT,
    ReviewStatus TEXT,
    CollectionMethod TEXT,
    OriginCounts TEXT,
    Submitter TEXT,
    SCV TEXT,
    SubmittedGeneSymbol TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS file_updates (
    file_name TEXT PRIMARY KEY,
    last_upload_datetime TIMESTAMP,
    file_modified_datetime TIMESTAMP,
    last_check_datetime TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS password_reset_codes (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE
  )`,

  `CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    full_names JSONB,
    variation_ids JSONB,
    clinical_significance JSONB,
    start_date DATE,
    end_date DATE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_type TEXT CHECK (search_type IN ('targeted', 'general')) DEFAULT 'targeted',
    search_groups JSONB,
    query_source TEXT CHECK (query_source IN ('web', 'database')) DEFAULT 'web'
  )`,

  `CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    full_name_preferences JSONB DEFAULT '[]',
    variation_id_preferences JSONB DEFAULT '[]'
  )`,

  `CREATE TABLE IF NOT EXISTS gene_variant_counts (
    gene_symbol TEXT PRIMARY KEY,
    variant_count INTEGER NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS component_parts (
    variation_id TEXT PRIMARY KEY,
    gene_symbol TEXT,
    transcript_id TEXT,
    dna_change TEXT,
    protein_change TEXT
  )`,
  
  `CREATE INDEX IF NOT EXISTS idx_gene_symbol_comp ON component_parts(gene_symbol);
   CREATE INDEX IF NOT EXISTS idx_transcript_id ON component_parts(transcript_id);
   CREATE INDEX IF NOT EXISTS idx_dna_change ON component_parts(dna_change);
   CREATE INDEX IF NOT EXISTS idx_protein_change ON component_parts(protein_change)`,

  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
];

async function runMigrations() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting migrations...');
    
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
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };