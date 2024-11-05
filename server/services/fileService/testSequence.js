require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const fsSync = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');
const { scrapeFileList, downloadFile } = require('./downloader');
const { filterFileWithGeneSymbols } = require('./filter');
const timeOperation = require('./utils/timing');

const pipeline = promisify(require('stream').pipeline);

// Configuration
const BASE_DIR = path.join(__dirname, '../../');  // server directory
const DOWNLOAD_DIR = path.join(BASE_DIR, 'data/downloads');
const TEMP_DIR = path.join(BASE_DIR, 'data/temp');
const GENE_SYMBOLS_PATH = path.join(BASE_DIR, '../public/data/Gene_Symbol.txt');

// Table schemas based on your current database
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

// File to table mapping
const FILE_TABLE_MAP = {
  'variant_summary.txt.gz': 'variant_summary',
  'submission_summary.txt.gz': 'submission_summary',
  'summary_of_conflicting_interpretations.txt': 'conflicting_interpretations',
  'hgvs4variation.txt.gz': 'hgvs_variation'
};

/**
 * Verifies file exists and is readable
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} Whether file exists and is readable
 */
async function verifyFile(filePath) {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    console.log(`Verified file ${filePath}:`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Modified: ${stats.mtime}`);
    return true;
  } catch (error) {
    console.error(`File verification failed for ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Gets processed file path
 * @param {string} fileName - Original file name
 * @param {string} stage - Processing stage
 * @returns {string} Processed file path
 */
function getProcessedFilePath(fileName, stage) {
  switch (stage) {
    case 'downloaded':
      return path.join(DOWNLOAD_DIR, fileName);
    case 'decompressed':
      return path.join(TEMP_DIR, fileName.endsWith('.gz') 
        ? fileName.replace('.gz', '') 
        : fileName);
    case 'filtered':
      return path.join(TEMP_DIR, fileName.endsWith('.gz')
        ? fileName.replace('.gz', '.filtered')
        : `${fileName}.filtered`);
    default:
      throw new Error(`Unknown processing stage: ${stage}`);
  }
}

/**
 * Decompress or copy file to temp directory
 * @param {string} inputPath - Path to input file
 * @returns {Promise<string>} Path to processed file
 */
async function decompressFile(inputPath) {
  const fileName = path.basename(inputPath);
  const outputPath = getProcessedFilePath(fileName, 'decompressed');

  console.log(`Processing ${inputPath} to ${outputPath}`);

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

  console.log('File processing complete');
  return outputPath;
}

/**
 * Main test sequence
 */
async function runTestSequence() {
  let pool;
  console.log('Starting test sequence...\n');
  
  const overallStart = process.hrtime.bigint();
  
  try {
    // Ensure directories exist
    await timeOperation('Create directories', async () => {
      await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
      await fs.mkdir(TEMP_DIR, { recursive: true });
    });

    // Create database connection pool
    pool = await timeOperation('Create database pool', async () => {
      return mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        namedPlaceholders: true,
        flags: ['LOCAL_FILES'],
        infileStreamFactory: (filePath) => fsSync.createReadStream(filePath)
      });
    });

    // Additional pool setup
    const setupConn = await pool.getConnection();
    try {
      await setupConn.query('SET GLOBAL local_infile = 1');
    } finally {
      setupConn.release();
    }

    // Step 1: Drop existing tables
    console.log('Step 1: Dropping existing tables...');
    await timeOperation('Drop existing tables', async () => {
      const connection = await pool.getConnection();
      try {
        await connection.query('DROP TABLE IF EXISTS file_updates');
        await connection.query('DROP TABLE IF EXISTS variant_summary');
        await connection.query('DROP TABLE IF EXISTS submission_summary');
        await connection.query('DROP TABLE IF EXISTS conflicting_interpretations');
        await connection.query('DROP TABLE IF EXISTS hgvs_variation');
        console.log('Tables dropped successfully');
      } finally {
        connection.release();
      }
    });

    // Step 2: Create tables
    console.log('\nStep 2: Creating tables...');
    await timeOperation('Create tables', async () => {
      const connection = await pool.getConnection();
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS file_updates (
            file_name VARCHAR(255) NOT NULL PRIMARY KEY,
            last_upload_datetime DATETIME,
            file_modified_datetime DATETIME,
            last_check_datetime DATETIME
          )
        `);

        for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
          console.log(`Creating table: ${tableName}`);
          await connection.query(schema);
        }
      } finally {
        connection.release();
      }
    });
    console.log('All tables created successfully\n');

    // Step 3: Download files
    console.log('Step 3: Downloading files...');
    const files = await timeOperation('Get file list', () => scrapeFileList());
    
    for (const fileInfo of files) {
      await timeOperation(`Download ${fileInfo.fileName}`, async () => {
        const downloadPath = path.join(DOWNLOAD_DIR, fileInfo.fileName);
        await downloadFile(fileInfo.url, downloadPath);
        console.log(`Downloaded ${fileInfo.fileName} to ${downloadPath}`);
      });
    }

    // Step 4: Process files
    console.log('\nStep 4: Processing files...');
    const processedFiles = [];
    
    for (const fileInfo of files) {
      try {
        console.log(`\nProcessing ${fileInfo.fileName}...`);
        
        // Verify downloaded file exists
        const downloadedPath = getProcessedFilePath(fileInfo.fileName, 'downloaded');
        if (!await verifyFile(downloadedPath)) {
          console.error(`Downloaded file not found: ${downloadedPath}`);
          continue;
        }
        
        // Process file (decompress or copy to temp)
        const processedPath = await timeOperation(`Process ${fileInfo.fileName}`, async () => {
          return decompressFile(downloadedPath);
        });
        
        // Verify processed file
        if (!await verifyFile(processedPath)) {
          console.error(`Processing failed for: ${fileInfo.fileName}`);
          continue;
        }
        
        // Filter the processed file
        const filteredPath = getProcessedFilePath(fileInfo.fileName, 'filtered');
        await timeOperation(`Filter ${fileInfo.fileName}`, async () => {
          const stats = await filterFileWithGeneSymbols(processedPath, GENE_SYMBOLS_PATH, filteredPath);
          console.log(`Filtered ${fileInfo.fileName}:`);
          console.log(`  Total lines: ${stats.totalLines}`);
          console.log(`  Matched lines: ${stats.matchedLines}`);
          console.log(`  Reduction: ${((1 - stats.matchedLines/stats.totalLines) * 100).toFixed(2)}%`);
        });
        
        // Verify filtered file
        if (await verifyFile(filteredPath)) {
          processedFiles.push({
            originalName: fileInfo.fileName,
            filteredPath: filteredPath
          });
        }

        // Clean up processed file
        if (processedPath !== downloadedPath) {
          await timeOperation('Cleanup processed file', () => 
            fs.unlink(processedPath)
          ).catch(console.error);
        }
      } catch (error) {
        console.error(`Error processing ${fileInfo.fileName}:`, error);
      }
    }

    // Step 5: Load into database
    console.log('\nStep 5: Loading data into database...');
    for (const file of processedFiles) {
      const tableName = FILE_TABLE_MAP[file.originalName];
      
      try {
        if (!await verifyFile(file.filteredPath)) {
          console.error(`Filtered file not found for loading: ${file.filteredPath}`);
          continue;
        }

        await timeOperation(`Load ${file.originalName} into database`, async () => {
          const connection = await pool.getConnection();
          try {
            await connection.query('SET foreign_key_checks = 0');
            await connection.query('SET unique_checks = 0');
            await connection.query('SET autocommit = 0');

            console.log(`Loading ${file.filteredPath} into ${tableName}...`);
            await connection.query(`
              LOAD DATA LOCAL INFILE ?
              INTO TABLE ${tableName}
              FIELDS TERMINATED BY '\t'
              ENCLOSED BY ''
              LINES TERMINATED BY '\n'
              IGNORE 1 LINES
            `, [file.filteredPath]);

            await connection.query(`
              INSERT INTO file_updates 
                (file_name, last_upload_datetime, file_modified_datetime, last_check_datetime)
              VALUES (?, NOW(), NOW(), NOW())
            `, [file.originalName]);

            await connection.query('COMMIT');
            
            // Restore settings
            await connection.query('SET foreign_key_checks = 1');
            await connection.query('SET unique_checks = 1');
            await connection.query('SET autocommit = 1');

            const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`Loaded ${countResult[0].count} rows into ${tableName}`);
          } finally {
            connection.release();
          }
        });
      } catch (error) {
        console.error(`Error loading ${file.originalName}:`, error);
      }
    }

    // Step 6: Verify final data
    console.log('\nStep 6: Verifying data...');
    await timeOperation('Verify data', async () => {
      const connection = await pool.getConnection();
      try {
        for (const [fileName, tableName] of Object.entries(FILE_TABLE_MAP)) {
          const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`${tableName}: ${rows[0].count} rows`);
        }
      } finally {
        connection.release();
      }
    });

    const overallEnd = process.hrtime.bigint();
    const totalDuration = Number(overallEnd - overallStart) / 1_000_000_000;
    console.log(`\nTotal execution time: ${totalDuration.toFixed(2)} seconds`);

  } catch (error) {
    const overallEnd = process.hrtime.bigint();
    const totalDuration = Number(overallEnd - overallStart) / 1_000_000_000;
    console.error(`Error in test sequence after ${totalDuration.toFixed(2)} seconds:`, error);
    throw error;
  } finally {
    await timeOperation('Cleanup', async () => {
      if (TEMP_DIR) {
        const tempFiles = await fs.readdir(TEMP_DIR).catch(() => []);
        console.log(`Cleaning up ${tempFiles.length} temporary files...`);
        await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(console.error);
      }
      if (pool) {
        await pool.end();
        console.log('Database connection closed');
      }
    });
    console.log('\nTest sequence finished');
  }
}

// Run test if called directly
if (require.main === module) {
  runTestSequence().catch(error => {
    console.error('Test sequence failed:', error);
    process.exit(1);
  });
}

module.exports = { runTestSequence };