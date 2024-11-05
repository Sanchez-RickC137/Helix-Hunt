const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;
const { downloadFile, scrapeFileList } = require('./downloader');
const { filterFileWithGeneSymbols } = require('./filter');
const { processSingleFile, verifyFile, getProcessedFilePath } = require('./processor');
const Logger = require('./utils/logger');
const timeOperation = require('./utils/timing');

// Configuration
const BASE_DIR = path.join(__dirname, '../../');
const DIRECTORIES = {
  download: path.join(BASE_DIR, 'data/downloads'),
  temp: path.join(BASE_DIR, 'data/temp'),
  gene_symbols: path.join(BASE_DIR, '../public/data/Gene_Symbol.txt')
};

// File processing schedule (minutes after 10:00 PM)
const FILE_SCHEDULE = [
  { file: 'variant_summary.txt.gz', minute: 0 },
  { file: 'submission_summary.txt.gz', minute: 15 },
  { file: 'summary_of_conflicting_interpretations.txt', minute: 30 },
  { file: 'hgvs4variation.txt.gz', minute: 45 }
];

class ProcessingSummary {
  constructor() {
    this.startTime = new Date();
    this.downloadResults = [];
    this.processingResults = [];
    this.totalStats = {
      filesProcessed: 0,
      totalLinesProcessed: 0,
      totalMatchedLines: 0,
      skippedFiles: 0,
      errors: []
    };
  }

  addDownloadResult(fileName, success, details = '') {
    this.downloadResults.push({ fileName, success, details });
  }

  addProcessingResult(fileName, stats) {
    this.processingResults.push({
      fileName,
      ...stats
    });
    if (stats.totalLines) {
      this.totalStats.totalLinesProcessed += stats.totalLines;
      this.totalStats.totalMatchedLines += stats.matchedLines;
      this.totalStats.filesProcessed++;
    }
  }

  addError(error) {
    this.totalStats.errors.push(error);
  }

  formatSummaryEmail() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000; // seconds

    let summary = `
ClinVar Update Processing Summary
--------------------------------
Start Time: ${this.startTime.toISOString()}
End Time: ${endTime.toISOString()}
Total Duration: ${duration.toFixed(2)} seconds

Download Summary:
----------------
${this.downloadResults.map(result => 
  `${result.fileName}: ${result.success ? 'Success' : 'Failed'}${result.details ? ` - ${result.details}` : ''}`
).join('\n')}

Processing Summary:
------------------
Files Processed: ${this.totalStats.filesProcessed}
Total Lines Processed: ${this.totalStats.totalLinesProcessed.toLocaleString()}
Total Matched Lines: ${this.totalStats.totalMatchedLines.toLocaleString()}
Overall Reduction: ${((1 - this.totalStats.totalMatchedLines/this.totalStats.totalLinesProcessed) * 100).toFixed(2)}%

Individual File Results:
----------------------
${this.processingResults.map(result => `
${result.fileName}:
  Total Lines: ${result.totalLines?.toLocaleString() || 'N/A'}
  Matched Lines: ${result.matchedLines?.toLocaleString() || 'N/A'}
  Processing Time: ${result.duration?.toFixed(2) || 'N/A'} seconds
  Reduction: ${result.reduction?.toFixed(2) || 'N/A'}%
  Database Load Time: ${result.loadTime?.toFixed(2) || 'N/A'} seconds
${result.skipReason ? `  Skipped: ${result.skipReason}` : ''}
`).join('\n')}
`;

    if (this.totalStats.errors.length > 0) {
      summary += `\nErrors:\n-------\n${this.totalStats.errors.join('\n')}`;
    }

    return summary;
  }
}

// Table schemas with correct names
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

  summary_of_conflicting_interpretations: `
    CREATE TABLE IF NOT EXISTS summary_of_conflicting_interpretations (
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

  hgvs4variation: `
    CREATE TABLE IF NOT EXISTS hgvs4variation (
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

/**
 * Creates necessary database tables
 * @param {Object} pool - Database connection pool
 * @param {Logger} logger - Logger instance
 */
async function createTables(pool, logger) {
  const connection = await pool.getConnection();
  try {
    // Create file updates tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS file_updates (
        file_name VARCHAR(255) NOT NULL PRIMARY KEY,
        last_upload_datetime DATETIME,
        file_modified_datetime DATETIME,
        last_check_datetime DATETIME
      )
    `);
    logger.log('Created file_updates table');

    // Create data tables
    for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
      await connection.query(schema);
      logger.log(`Created ${tableName} table`);
    }
  } catch (error) {
    logger.log(`Error creating tables: ${error.message}`, 'error');
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Process a single file through the pipeline
 * @param {Object} pool - Database connection
 * @param {Object} fileInfo - File information
 * @param {Logger} logger - Logger instance
 * @param {Object} stats - Statistics object to update
 */
async function processFile(pool, fileInfo, logger, stats = {}) {
  try {
    logger.log(`Processing ${fileInfo.fileName}...`);
    
    // Verify downloaded file
    const downloadPath = getProcessedFilePath(fileInfo.fileName, 'downloaded', DIRECTORIES);
    if (!await verifyFile(downloadPath, logger)) {
      throw new Error(`Downloaded file not found: ${downloadPath}`);
    }

    // Process file (decompress)
    const decompressedPath = getProcessedFilePath(fileInfo.fileName, 'decompressed', DIRECTORIES);
    await timeOperation('Decompress/Copy', async () => {
      if (fileInfo.fileName.endsWith('.gz')) {
        const { pipeline } = require('stream/promises');
        const zlib = require('zlib');
        await pipeline(
          require('fs').createReadStream(downloadPath),
          zlib.createGunzip(),
          require('fs').createWriteStream(decompressedPath)
        );
      } else {
        await fs.copyFile(downloadPath, decompressedPath);
      }
      logger.log('File decompression complete');
    });

    // Process directly into database
    const loadStart = process.hrtime.bigint();
    await processSingleFile(pool, fileInfo, DIRECTORIES, logger);
    const loadEnd = process.hrtime.bigint();
    stats.loadTime = Number(loadEnd - loadStart) / 1_000_000_000; // Convert to seconds

    // Get line count for stats
    const fileStats = await fs.stat(decompressedPath);
    stats.totalLines = fileStats.size; // Use file size as a proxy for now
    stats.duration = stats.loadTime;

    // Clean up decompressed file
    await timeOperation('Cleanup', async () => {
      await fs.unlink(decompressedPath).catch(error => 
        logger.log(`Error cleaning up decompressed file: ${error.message}`, 'warning')
      );
    });

  } catch (error) {
    logger.log(`Error processing ${fileInfo.fileName}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Downloads and processes all files
 * @param {Object} pool - Database connection
 */
async function processAllFiles(pool) {
  const logger = new Logger();
  const summary = new ProcessingSummary();

  try {
    logger.log('Starting weekly file processing');

    // Download files
    const files = await scrapeFileList();
    for (const fileInfo of files) {
      try {
        await downloadFile(fileInfo.url, path.join(DIRECTORIES.download, fileInfo.fileName));
        summary.addDownloadResult(fileInfo.fileName, true);
      } catch (error) {
        summary.addDownloadResult(fileInfo.fileName, false, error.message);
        summary.addError(`Download failed for ${fileInfo.fileName}: ${error.message}`);
      }
    }

    // Process each file
    for (const fileInfo of files) {
      try {
        const stats = {}; // Will hold processing statistics
        await processFile(pool, fileInfo, logger, stats);
        summary.addProcessingResult(fileInfo.fileName, stats);
      } catch (error) {
        summary.addError(`Processing failed for ${fileInfo.fileName}: ${error.message}`);
      }
    }

    // Send single email with complete summary
    await logger.sendEmail(
      'Weekly ClinVar Update', 
      summary.totalStats.errors.length === 0,
      summary.formatSummaryEmail()
    );

  } catch (error) {
    summary.addError(`Fatal error in batch processing: ${error.message}`);
    await logger.sendEmail(
      'Weekly ClinVar Update', 
      false,
      summary.formatSummaryEmail()
    );
  }
}

/**
 * Initializes schedules for file processing
 * @param {Object} pool - Database connection
 */
function initializeSchedules(pool) {
  // Download files at 9:45 PM Friday
  schedule.scheduleJob('45 21 * * 5', async () => {
    await processAllFiles(pool);
  });
}

/**
 * Initializes data service
 * @param {Object} pool - Database connection
 */
async function initializeDataService(pool) {
  const logger = new Logger();
  try {
    // Ensure directories exist
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });

    // Create tables
    await createTables(pool, logger);
    logger.log('Database tables created successfully');

    // Initialize schedules
    initializeSchedules(pool);
    
    logger.log('Data service initialized successfully');
  } catch (error) {
    logger.log('Failed to initialize data service: ' + error.message, 'error');
    throw error;
  }
}

module.exports = { 
  initializeDataService,
  processAllFiles,  // Export for testing
  processFile      // Export for testing
};