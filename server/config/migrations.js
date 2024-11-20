const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(255) NOT NULL
  )`,

  // File updates table
  `CREATE TABLE IF NOT EXISTS file_updates (
    file_name VARCHAR(255) NOT NULL PRIMARY KEY,
    last_upload_datetime DATETIME,
    file_modified_datetime DATETIME,
    last_check_datetime DATETIME
  )`,

  // Password reset codes table
  `CREATE TABLE IF NOT EXISTS password_reset_codes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used TINYINT(1) DEFAULT 0
  )`,

  // Query history table
  `CREATE TABLE IF NOT EXISTS query_history (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    full_names JSON,
    variation_ids JSON,
    clinical_significance JSON,
    start_date DATE,
    end_date DATE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_type ENUM('targeted', 'general') DEFAULT 'targeted',
    search_groups JSON,
    query_source ENUM('web', 'database') DEFAULT 'web'
  )`,

  // User preferences table
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    full_name_preferences JSON,
    variation_id_preferences JSON
  )`,

  // Variant summary table
  `CREATE TABLE IF NOT EXISTS variant_summary (
    AlleleID VARCHAR(255),
    Type VARCHAR(255),
    Name TEXT,
    GeneID VARCHAR(255),
    GeneSymbol VARCHAR(255),
    HGNC_ID VARCHAR(255),
    ClinicalSignificance TEXT,
    ClinSigSimple VARCHAR(255),
    LastEvaluated VARCHAR(255),
    \`RS#_dbSNP\` VARCHAR(255),
    nsv_esv_dbVar VARCHAR(255),
    RCVaccession TEXT,
    PhenotypeIDS TEXT,
    PhenotypeList TEXT,
    Origin TEXT,
    OriginSimple VARCHAR(255),
    Assembly VARCHAR(255),
    ChromosomeAccession VARCHAR(255),
    Chromosome VARCHAR(255),
    Start VARCHAR(255),
    Stop VARCHAR(255),
    ReferenceAllele TEXT,
    AlternateAllele TEXT,
    Cytogenetic VARCHAR(255),
    ReviewStatus VARCHAR(255),
    NumberSubmitters VARCHAR(255),
    Guidelines TEXT,
    TestedInGTR VARCHAR(255),
    OtherIDs TEXT,
    SubmitterCategories TEXT,
    VariationID VARCHAR(255),
    PositionVCF VARCHAR(255),
    ReferenceAlleleVCF TEXT,
    AlternateAlleleVCF TEXT
  )`,

  // Submission summary table
  `CREATE TABLE IF NOT EXISTS submission_summary (
    VariationID VARCHAR(255),
    ClinicalSignificance TEXT,
    DateLastEvaluated VARCHAR(255),
    Description TEXT,
    SubmittedPhenotypeInfo TEXT,
    ReportedPhenotypeInfo TEXT,
    ReviewStatus VARCHAR(255),
    CollectionMethod VARCHAR(255),
    OriginCounts TEXT,
    Submitter TEXT,
    SCV VARCHAR(255),
    SubmittedGeneSymbol VARCHAR(255)
  )`,

  // HGVS variation table
  // `CREATE TABLE IF NOT EXISTS hgvs_variation (
  //   Symbol VARCHAR(255),
  //   GeneID VARCHAR(255),
  //   VariationID VARCHAR(255),
  //   AlleleID VARCHAR(255),
  //   Type VARCHAR(255),
  //   Assembly VARCHAR(255),
  //   NucleotideExpression TEXT,
  //   NucleotideChange TEXT,
  //   ProteinExpression TEXT,
  //   ProteinChange TEXT,
  //   UsedForNaming VARCHAR(255),
  //   Submitted VARCHAR(255),
  //   OnRefSeqGene VARCHAR(255)
  // )`,

  // // Conflicting interpretations table
  // `CREATE TABLE IF NOT EXISTS conflicting_interpretations (
  //   Gene_Symbol VARCHAR(255),
  //   NCBI_Variation_ID VARCHAR(255),
  //   ClinVar_Preferred TEXT,
  //   Submitter1 TEXT,
  //   Submitter1_SCV VARCHAR(255),
  //   Submitter1_ClinSig TEXT,
  //   Submitter1_LastEval VARCHAR(255),
  //   Submitter1_ReviewStatus TEXT,
  //   Submitter1_Sub_Condition TEXT,
  //   Submitter1_Description TEXT,
  //   Submitter2 TEXT,
  //   Submitter2_SCV VARCHAR(255),
  //   Submitter2_ClinSig TEXT,
  //   Submitter2_LastEval VARCHAR(255),
  //   Submitter2_ReviewStatus TEXT,
  //   Submitter2_Sub_Condition TEXT,
  //   Submitter2_Description TEXT,
  //   Rank_diff VARCHAR(255),
  //   Conflict_Reported VARCHAR(255),
  //   Variant_type VARCHAR(255),
  //   Submitter1_Method VARCHAR(255),
  //   Submitter2_Method VARCHAR(255)
  // )`,

  `CREATE TABLE IF NOT EXISTS gene_variant_counts (
    gene_symbol VARCHAR(255) PRIMARY KEY,
    variant_count INT NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gene_symbol (gene_symbol),
    INDEX idx_variant_count (variant_count)
  )`,

  `CREATE TABLE IF NOT EXISTS component_parts (
  variation_id VARCHAR(255) NOT NULL,
  gene_symbol VARCHAR(255),
  transcript_id VARCHAR(255),
  dna_change TEXT,
  protein_change TEXT,
  PRIMARY KEY (variation_id),
  INDEX idx_gene_symbol (gene_symbol),
  INDEX idx_dna_change (dna_change(255)),
  INDEX idx_protein_change (protein_change(255))
  ) ENGINE=InnoDB
 `
];

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

runMigrations().then(() => {
  console.log('All migrations completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration process failed:', error);
  process.exit(1);
});