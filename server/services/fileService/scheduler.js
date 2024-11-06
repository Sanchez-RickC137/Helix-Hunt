const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;
const { downloadFile, scrapeFileList } = require('./downloader');
const { processSingleFile } = require('./processor');
const Logger = require('./utils/logger');
const MD5Verifier = require('./utils/md5Verifier');
const timeOperation = require('./utils/timing');

// Configuration
const BASE_DIR = path.join(__dirname, '../../');
const DIRECTORIES = {
  download: path.join(BASE_DIR, 'data/downloads'),
  temp: path.join(BASE_DIR, 'data/temp')
};

// File processing schedule (minutes after 10:00 PM)
const FILE_SCHEDULE = [
  { file: 'variant_summary.txt.gz', minute: 15 },
  { file: 'submission_summary.txt.gz', minute: 30 },
  { file: 'summary_of_conflicting_interpretations.txt', minute: 45 },
  { file: 'hgvs4variation.txt.gz', minute: 59 }
];

class ProcessingSummary {
  constructor() {
    this.startTime = new Date();
    this.downloadResults = [];
    this.processingResults = [];
    this.totalStats = {
      filesProcessed: 0,
      totalLinesProcessed: 0,
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
      this.totalStats.filesProcessed++;
    }
  }

  addError(error) {
    this.totalStats.errors.push(error);
  }

  formatSummaryEmail() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    return `
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

Individual File Results:
----------------------
${this.processingResults.map(result => `
${result.fileName}:
  Total Lines: ${result.totalLines?.toLocaleString() || 'N/A'}
  Processing Time: ${result.duration?.toFixed(2) || 'N/A'} seconds
  Database Load Time: ${result.loadTime?.toFixed(2) || 'N/A'} seconds
${result.skipReason ? `  Skipped: ${result.skipReason}` : ''}
`).join('\n')}

${this.totalStats.errors.length > 0 ? `\nErrors:\n-------\n${this.totalStats.errors.join('\n')}` : ''}`;
  }
}

/**
 * Verify file exists and is readable
 */
async function verifyFile(filePath, logger) {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    logger.log(`Verified file ${filePath}:`);
    logger.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    logger.log(`  Modified: ${stats.mtime}`);
    return true;
  } catch (error) {
    logger.log(`File verification failed for ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Process a single ClinVar file
 */
async function processFile(pool, fileInfo, logger) {
  const md5Verifier = new MD5Verifier();
  const stats = {};

  try {
    // Download path
    const downloadPath = path.join(DIRECTORIES.download, fileInfo.fileName);
    logger.log(`Processing ${fileInfo.fileName}...`);

    // Verify MD5
    const isValid = await md5Verifier.verifyFile(fileInfo.url, downloadPath, logger);
    if (!isValid) {
      throw new Error(`MD5 verification failed for ${fileInfo.fileName}`);
    }

    // Decompress file
    const decompressedPath = path.join(DIRECTORIES.temp, 
      fileInfo.fileName.endsWith('.gz') ? 
        fileInfo.fileName.replace('.gz', '') : 
        fileInfo.fileName
    );

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

    // Verify decompressed file
    if (!await verifyFile(decompressedPath, logger)) {
      throw new Error(`Decompressed file not found or not readable: ${decompressedPath}`);
    }

    // Process into database
    const loadStart = process.hrtime.bigint();
    await processSingleFile(pool, { 
      ...fileInfo, 
      processedPath: decompressedPath // Pass the decompressed file path
    }, DIRECTORIES, logger);
    const loadEnd = process.hrtime.bigint();
    stats.loadTime = Number(loadEnd - loadStart) / 1_000_000_000;

    // Get stats
    const fileStats = await fs.stat(decompressedPath);
    stats.totalLines = fileStats.size;
    stats.duration = stats.loadTime;

    // Cleanup decompressed file
    await timeOperation('Cleanup', async () => {
      await fs.unlink(decompressedPath).catch(error => 
        logger.log(`Error cleaning up decompressed file: ${error.message}`, 'warning')
      );
    });

    return stats;
  } catch (error) {
    logger.log(`Error processing ${fileInfo.fileName}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Process all ClinVar files
 */
async function processAllFiles(pool) {
  const logger = new Logger();
  const summary = new ProcessingSummary();

  try {
    logger.log('Starting weekly file processing');

    // Ensure directories exist
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });

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
        const stats = await processFile(pool, fileInfo, logger);
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
  } finally {
    // Cleanup
    try {
      await fs.rm(DIRECTORIES.temp, { recursive: true, force: true });
    } catch (error) {
      logger.log(`Error cleaning up temp directory: ${error.message}`, 'warning');
    }
  }
}

/**
 * Initialize schedules
 */
function initializeSchedules(pool, logger) {
  // Schedule main weekly update for Monday at 10:00 PM
  schedule.scheduleJob('03 20 * * 2', async () => {
    logger.log('Starting weekly file batch processing');
    await processAllFiles(pool);
  });

  // Individual file schedules
  FILE_SCHEDULE.forEach(({ file, minute }) => {
    const cronPattern = `${minute} 20 * * 2`; // Monday at 10:XX PM
    schedule.scheduleJob(cronPattern, async () => {
      logger.log(`Starting scheduled processing for ${file}`);
      const fileInfo = { fileName: file };
      try {
        await processFile(pool, fileInfo, logger);
        logger.log(`Successfully processed ${file}`);
      } catch (error) {
        logger.log(`Error processing ${file}: ${error.message}`, 'error');
      }
    });
  });

  // Daily health check
  schedule.scheduleJob('0 9 * * *', () => {
    const schedules = schedule.scheduledJobs;
    logger.log(`Health check: ${Object.keys(schedules).length} scheduled jobs active`);
    Object.entries(schedules).forEach(([name, job]) => {
      logger.log(`Next run for ${name}: ${job.nextInvocation()}`);
    });
  });
}

/**
 * Initialize the scheduler system
 */
async function initializeScheduler(pool) {
  const logger = new Logger();
  try {
    // Create directories
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });

    // Initialize schedules
    initializeSchedules(pool, logger);
    logger.log('Scheduler initialized successfully');

    // Log next scheduled runs
    const schedules = schedule.scheduledJobs;
    Object.entries(schedules).forEach(([name, job]) => {
      logger.log(`Next scheduled run for ${name}: ${job.nextInvocation()}`);
    });
  } catch (error) {
    logger.log('Failed to initialize scheduler: ' + error.message, 'error');
    throw error;
  }
}

module.exports = { 
  initializeScheduler,
  processAllFiles,
  processFile,
  DIRECTORIES,
  FILE_SCHEDULE
};