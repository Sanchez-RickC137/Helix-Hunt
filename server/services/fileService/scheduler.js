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
  { file: 'variant_summary.txt.gz', minute: 12 },
  { file: 'submission_summary.txt.gz', minute: 25 },
  { file: 'summary_of_conflicting_interpretations.txt', minute: 35 },
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
        logger.log(`Successfully downloaded ${fileInfo.fileName}`);
      } catch (error) {
        summary.addDownloadResult(fileInfo.fileName, false, error.message);
        summary.addError(`Download failed for ${fileInfo.fileName}: ${error.message}`);
        logger.log(`Failed to download ${fileInfo.fileName}: ${error.message}`, 'error');
      }
    }

    // Process each file
    for (const fileInfo of files) {
      try {
        const stats = {}; // Will hold processing statistics
        await processFile(pool, fileInfo, logger, stats);
        summary.addProcessingResult(fileInfo.fileName, stats);
        logger.log(`Successfully processed ${fileInfo.fileName}`);
      } catch (error) {
        summary.addError(`Processing failed for ${fileInfo.fileName}: ${error.message}`);
        logger.log(`Failed to process ${fileInfo.fileName}: ${error.message}`, 'error');
      }
    }

    // Send summary email
    await logger.sendEmail(
      'Weekly ClinVar Update', 
      summary.totalStats.errors.length === 0,
      summary.formatSummaryEmail()
    );

  } catch (error) {
    summary.addError(`Fatal error in batch processing: ${error.message}`);
    logger.log(`Fatal error in batch processing: ${error.message}`, 'error');
    await logger.sendEmail(
      'Weekly ClinVar Update', 
      false,
      summary.formatSummaryEmail()
    );
  }
}

/**
 * Creates a scheduled job with error handling and logging
 * @param {string} cronPattern - Cron pattern for the schedule
 * @param {Function} task - Task to execute
 * @param {string} description - Description of the scheduled task
 * @param {Logger} logger - Logger instance
 * @returns {Object} Scheduled job object
 */
function createScheduledJob(cronPattern, task, description, logger) {
  try {
    const job = schedule.scheduleJob(cronPattern, async () => {
      logger.log(`Starting scheduled task: ${description}`);
      try {
        await task();
        logger.log(`Completed scheduled task: ${description}`);
      } catch (error) {
        logger.log(`Error in scheduled task ${description}: ${error.message}`, 'error');
        await logger.sendEmail(
          `Scheduled Task Failed: ${description}`,
          false,
          `Task failed with error: ${error.message}\n\nStack trace:\n${error.stack}`
        );
      }
    });

    if (job) {
      logger.log(`Successfully scheduled task: ${description} with pattern: ${cronPattern}`);
      return job;
    } else {
      throw new Error('Failed to create scheduled job');
    }
  } catch (error) {
    logger.log(`Error creating scheduled task ${description}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Initializes schedules for file processing
 * @param {Object} pool - Database connection
 * @param {Logger} logger - Logger instance
 */
function initializeSchedules(pool, logger) {
  // Schedule main weekly update for Monday at 10:00 PM
  createScheduledJob('0 22 * * 1', async () => {
    logger.log('Starting weekly file batch processing');
    await processAllFiles(pool);
  }, 'Weekly ClinVar Update', logger);

  // Schedule individual file processing tasks
  FILE_SCHEDULE.forEach(({ file, minute }) => {
    const cronPattern = `${minute} 23 * * 1`; // Monday at 10:XX PM
    createScheduledJob(cronPattern, async () => {
      logger.log(`Starting scheduled processing for ${file}`);
      const fileInfo = { fileName: file };
      const stats = {};
      await processFile(pool, fileInfo, logger, stats);
    }, `Process ${file}`, logger);
  });

  // Add a daily health check job
  createScheduledJob('0 9 * * *', async () => {
    const schedules = schedule.scheduledJobs;
    const activeJobs = Object.keys(schedules).length;
    logger.log(`Health check: ${activeJobs} scheduled jobs active`);
    
    // Log next run times for all jobs
    Object.entries(schedules).forEach(([name, job]) => {
      logger.log(`Next run for ${name}: ${job.nextInvocation()}`);
    });
  }, 'Schedule Health Check', logger);
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

    // Initialize schedules with logger
    initializeSchedules(pool, logger);
    
    logger.log('Data service initialized successfully');

    // Log next scheduled run times
    const schedules = schedule.scheduledJobs;
    Object.entries(schedules).forEach(([name, job]) => {
      logger.log(`Next scheduled run for ${name}: ${job.nextInvocation()}`);
    });
  } catch (error) {
    logger.log('Failed to initialize data service: ' + error.message, 'error');
    throw error;
  }
}

module.exports = { 
  initializeDataService,
  processAllFiles,
  processFile,
  createScheduledJob // Export for testing
};