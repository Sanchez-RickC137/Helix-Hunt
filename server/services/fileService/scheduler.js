const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const { downloadFile, scrapeFileList } = require('./downloader');
const { processSingleFile, verifyFile } = require('./processor');
const { updateGeneCounts } = require('./geneCount.service');
const Logger = require('./utils/logger');
const MD5Verifier = require('./utils/md5Verifier');
const timeOperation = require('./utils/timing');

// Configuration
const BASE_DIR = path.join(__dirname, '../../');
const DIRECTORIES = {
  download: path.join(BASE_DIR, 'data/downloads'),
  temp: path.join(BASE_DIR, 'data/temp'),
  logs: path.join(BASE_DIR, 'logs')
};

// Files in processing order
const PROCESS_FILES = [
  'variant_summary.txt.gz',
  'submission_summary.txt.gz'
];

// Process tracking
const ACTIVE_PROCESSES = new Map();

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

  async formatSummaryEmail() {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    // Read component parts log if it exists
    let componentPartsLog = '';
    try {
      componentPartsLog = await fs.readFile(
        path.join(DIRECTORIES.logs, 'componentPartFailures.log'), 
        'utf8'
      );
    } catch (error) {
      componentPartsLog = 'No component parts processing issues reported';
    }

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

${this.totalStats.errors.length > 0 ? `\nErrors:\n-------\n${this.totalStats.errors.join('\n')}` : ''}

Component Parts Processing Log:
-----------------------------
${componentPartsLog}`;
  }
}

/**
 * Clean up all temporary files and directories
 */
async function cleanupAfterProcessing(logger) {
  try {
    // Remove temp and download directories
    await rimraf(DIRECTORIES.temp);
    logger.log('Cleaned up temp directory');

    await rimraf(DIRECTORIES.download);
    logger.log('Cleaned up downloads directory');

    // Clean up logs except componentPartFailures.log
    const logsDir = path.join(__dirname, '../../logs');
    const logFiles = await fs.readdir(logsDir);
    
    for (const file of logFiles) {
      if (file !== 'componentPartFailures.log') {
        await fs.unlink(path.join(logsDir, file));
      }
    }
    logger.log('Cleaned up log files');

    // Recreate necessary directories
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
  } catch (error) {
    logger.log(`Error during cleanup: ${error.message}`, 'error');
  }
}

/**
 * Process a single file
 */
async function processFile(pool, fileInfo, logger, summary) {
  const fileName = fileInfo.fileName;

  if (ACTIVE_PROCESSES.has(fileName)) {
    logger.log(`File ${fileName} is already being processed, skipping...`);
    return;
  }

  try {
    ACTIVE_PROCESSES.set(fileName, new Date());
    const stats = {};

    // Setup paths
    const downloadPath = path.join(DIRECTORIES.download, fileName);
    const decompressedPath = path.join(DIRECTORIES.temp, 
      fileName.endsWith('.gz') ? fileName.replace('.gz', '') : fileName
    );

    // Clean existing files
    await fs.unlink(downloadPath).catch(() => {});
    await fs.unlink(decompressedPath).catch(() => {});

    // Download and verify
    await downloadFile(fileInfo.url, downloadPath);
    summary.addDownloadResult(fileName, true);

    const md5Verifier = new MD5Verifier();
    const isValid = await md5Verifier.verifyFile(fileInfo.url, downloadPath, logger);
    if (!isValid) {
      throw new Error(`MD5 verification failed for ${fileName}`);
    }

    // Decompress
    await timeOperation('Decompress/Copy', async () => {
      if (fileName.endsWith('.gz')) {
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
    });

    // Verify and process
    if (!await verifyFile(decompressedPath, logger)) {
      throw new Error(`Decompressed file verification failed: ${decompressedPath}`);
    }

    const loadStart = process.hrtime.bigint();
    await processSingleFile(pool, { 
      ...fileInfo, 
      processedPath: decompressedPath
    }, DIRECTORIES, logger);
    const loadEnd = process.hrtime.bigint();
    
    // Calculate stats
    stats.loadTime = Number(loadEnd - loadStart) / 1_000_000_000;
    const fileStats = await fs.stat(decompressedPath);
    stats.totalLines = fileStats.size;
    stats.duration = stats.loadTime;

    summary.addProcessingResult(fileName, stats);
    return stats;
  } catch (error) {
    logger.log(`Error processing ${fileName}: ${error.message}`, 'error');
    summary.addDownloadResult(fileName, false, error.message);
    summary.addError(`Error processing ${fileName}: ${error.message}`);
    throw error;
  } finally {
    ACTIVE_PROCESSES.delete(fileName);
  }
}

/**
 * Process all files and perform related tasks
 */
async function processAllFiles(pool) {
  const logger = new Logger();
  const summary = new ProcessingSummary();

  try {
    logger.log('Starting ClinVar update process');

    // Ensure directories exist
    await Promise.all([
      fs.mkdir(DIRECTORIES.download, { recursive: true }),
      fs.mkdir(DIRECTORIES.temp, { recursive: true }),
      fs.mkdir(DIRECTORIES.logs, { recursive: true })
    ]);

    // Get and process files
    const files = await scrapeFileList();
    const orderedFiles = PROCESS_FILES
      .map(fileName => files.find(f => f.fileName === fileName))
      .filter(Boolean);

    for (const fileInfo of orderedFiles) {
      try {
        logger.log(`Processing ${fileInfo.fileName}`);
        await processFile(pool, fileInfo, logger, summary);
        logger.log(`Successfully processed ${fileInfo.fileName}`);
      } catch (error) {
        const errorMessage = `Error processing ${fileInfo.fileName}: ${error.message}`;
        summary.addError(errorMessage);
        logger.log(errorMessage, 'error');
      }
    }

    // Update gene counts
    try {
      logger.log('Updating gene counts');
      await updateGeneCounts();
      logger.log('Gene counts updated successfully');
    } catch (error) {
      const errorMessage = `Gene count update failed: ${error.message}`;
      summary.addError(errorMessage);
      logger.log(errorMessage, 'error');
    }

    // Send email report
    const emailContent = await summary.formatSummaryEmail();
    await logger.sendEmail(
      'ClinVar Update',
      summary.totalStats.errors.length === 0,
      emailContent
    );

    // Cleanup
    await cleanupAfterProcessing(logger);
    try {
      const logsDir = path.join(__dirname, '../../logs');
      const logFiles = await fs.readdir(logsDir);
      
      for (const file of logFiles) {
        if (file !== 'componentPartFailures.log') {
          await fs.unlink(path.join(logsDir, file));
        }
      }
      logger.log('Cleaned up log files');
    } catch (error) {
      logger.log(`Error cleaning up logs: ${error.message}`, 'error');
    }

  } catch (error) {
    logger.log(`Fatal error in update process: ${error.message}`, 'error');
    summary.addError(`Fatal error: ${error.message}`);
    const emailContent = await summary.formatSummaryEmail();
    await logger.sendEmail('ClinVar Update', false, emailContent);
  }
}

/**
 * Initialize the scheduler
 */
async function initializeScheduler(pool) {
  const logger = new Logger();
  
  try {
    // Ensure directories exist
    await Promise.all([
      fs.mkdir(DIRECTORIES.download, { recursive: true }),
      fs.mkdir(DIRECTORIES.temp, { recursive: true }),
      fs.mkdir(DIRECTORIES.logs, { recursive: true })
    ]);

    // Schedule weekly update
    schedule.scheduleJob('23 00 * * 3', async () => {
      logger.log('Starting scheduled weekly ClinVar update');
      await processAllFiles(pool);
    });

    // Schedule daily health check
    schedule.scheduleJob('0 9 * * *', () => {
      const schedules = schedule.scheduledJobs;
      logger.log(`Health check: ${Object.keys(schedules).length} scheduled jobs active`);
      logger.log(`Active processes: ${Array.from(ACTIVE_PROCESSES.keys()).join(', ')}`);
    });

    logger.log('Scheduler initialized successfully');
  } catch (error) {
    logger.log(`Failed to initialize scheduler: ${error.message}`, 'error');
    throw error;
  }
}

module.exports = { 
  initializeScheduler,
  processAllFiles,
  processFile,
  DIRECTORIES
};