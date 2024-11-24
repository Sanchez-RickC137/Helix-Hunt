const mysql = require('mysql2/promise');
const { scrapeFileList, downloadFile } = require('./downloader');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');
require('dotenv').config();

const pipeline = promisify(require('stream').pipeline);

const DIRECTORIES = {
  download: path.join(__dirname, '../../data/downloads'),
  temp: path.join(__dirname, '../../data/temp')
};

const TABLE_SCHEMAS = {
  variant_summary: `
    CREATE TABLE IF NOT EXISTS variant_summary (
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
      AlternateAlleleVCF TEXT,
      INDEX idx_gene_symbol (GeneSymbol),
      INDEX idx_variation_id (VariationID)
    ) ENGINE=InnoDB`,

  submission_summary: `
    CREATE TABLE IF NOT EXISTS submission_summary (
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
      SubmittedGeneSymbol VARCHAR(255),
      INDEX idx_variation_id (VariationID)
    ) ENGINE=InnoDB`,

  conflicting_interpretations: `
    CREATE TABLE IF NOT EXISTS conflicting_interpretations (
      Gene_Symbol VARCHAR(255),
      NCBI_Variation_ID VARCHAR(255),
      ClinVar_Preferred TEXT,
      Submitter1 TEXT,
      Submitter1_SCV VARCHAR(255),
      Submitter1_ClinSig TEXT,
      Submitter1_LastEval VARCHAR(255),
      Submitter1_ReviewStatus TEXT,
      Submitter1_Sub_Condition TEXT,
      Submitter1_Description TEXT,
      Submitter2 TEXT,
      Submitter2_SCV VARCHAR(255),
      Submitter2_ClinSig TEXT,
      Submitter2_LastEval VARCHAR(255),
      Submitter2_ReviewStatus TEXT,
      Submitter2_Sub_Condition TEXT,
      Submitter2_Description TEXT,
      Rank_diff VARCHAR(255),
      Conflict_Reported VARCHAR(255),
      Variant_type VARCHAR(255),
      Submitter1_Method VARCHAR(255),
      Submitter2_Method VARCHAR(255),
      INDEX idx_gene_symbol (Gene_Symbol),
      INDEX idx_variation_id (NCBI_Variation_ID)
    ) ENGINE=InnoDB`,

  hgvs_variation: `
    CREATE TABLE IF NOT EXISTS hgvs_variation (
      Symbol VARCHAR(255),
      GeneID VARCHAR(255),
      VariationID VARCHAR(255),
      AlleleID VARCHAR(255),
      Type VARCHAR(255),
      Assembly VARCHAR(255),
      NucleotideExpression TEXT,
      NucleotideChange TEXT,
      ProteinExpression TEXT,
      ProteinChange TEXT,
      UsedForNaming VARCHAR(255),
      Submitted VARCHAR(255),
      OnRefSeqGene VARCHAR(255),
      INDEX idx_symbol (Symbol),
      INDEX idx_variation_id (VariationID)
    ) ENGINE=InnoDB`
};

const FILE_TABLE_MAP = {
  'variant_summary.txt.gz': 'variant_summary',
  'submission_summary.txt.gz': 'submission_summary',
  'summary_of_conflicting_interpretations.txt': 'conflicting_interpretations',
  'hgvs4variation.txt.gz': 'hgvs_variation'
};

async function ensureDirectories() {
  await fs.mkdir(DIRECTORIES.download, { recursive: true });
  await fs.mkdir(DIRECTORIES.temp, { recursive: true });
}

async function decompressFile(inputPath, outputPath) {
  if (inputPath.endsWith('.gz')) {
    await pipeline(
      fsSync.createReadStream(inputPath),
      zlib.createGunzip(),
      fsSync.createWriteStream(outputPath)
    );
  } else {
    await pipeline(
      fsSync.createReadStream(inputPath),
      fsSync.createWriteStream(outputPath)
    );
  }
}

async function createTables(connection) {
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    // console.log(`Creating table ${tableName}...`);
    await connection.query(schema);
  }
}

async function downloadAndLoad() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    namedPlaceholders: true,
    flags: ['LOCAL_FILES'],
    infileStreamFactory: (filepath) => fsSync.createReadStream(filepath)
  });

  try {
    await ensureDirectories();

    // Create tables first
    const connection = await pool.getConnection();
    try {
      await createTables(connection);
      await connection.query('SET GLOBAL local_infile = 1');
    } finally {
      connection.release();
    }

    // Download and process files
    const files = await scrapeFileList();
    for (const fileInfo of files) {
      try {
        // Download
        const downloadPath = path.join(DIRECTORIES.download, fileInfo.fileName);
        // console.log(`Downloading ${fileInfo.fileName}...`);
        await downloadFile(fileInfo.url, downloadPath);

        // Decompress
        const decompressedPath = path.join(DIRECTORIES.temp, 
          fileInfo.fileName.endsWith('.gz') ? 
            fileInfo.fileName.replace('.gz', '') : 
            fileInfo.fileName
        );
        // console.log(`Decompressing ${fileInfo.fileName}...`);
        await decompressFile(downloadPath, decompressedPath);

        // Load into database
        const tableName = FILE_TABLE_MAP[fileInfo.fileName];
        if (tableName) {
          // console.log(`Loading ${fileInfo.fileName} into ${tableName}...`);
          const connection = await pool.getConnection();
          try {
            await connection.query('SET foreign_key_checks = 0');
            await connection.query('SET unique_checks = 0');
            await connection.query('SET autocommit = 0');

            await connection.query(`
              LOAD DATA LOCAL INFILE ?
              INTO TABLE ${tableName}
              FIELDS TERMINATED BY '\t'
              ENCLOSED BY ''
              LINES TERMINATED BY '\n'
              IGNORE 1 LINES
            `, [decompressedPath]);

            await connection.query('COMMIT');

            // Restore settings
            await connection.query('SET foreign_key_checks = 1');
            await connection.query('SET unique_checks = 1');
            await connection.query('SET autocommit = 1');

            // Get count
            const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            // console.log(`Loaded ${countResult[0].count} rows into ${tableName}`);
          } finally {
            connection.release();
          }
        }

        // Cleanup decompressed file
        await fs.unlink(decompressedPath).catch(console.error);

      } catch (error) {
        console.error(`Error processing ${fileInfo.fileName}:`, error);
      }
    }

  } catch (error) {
    console.error('Error in download and load process:', error);
  } finally {
    // Cleanup
    try {
      await fs.rm(DIRECTORIES.temp, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
    await pool.end();
  }
}

if (require.main === module) {
  downloadAndLoad();
}

module.exports = { downloadAndLoad };