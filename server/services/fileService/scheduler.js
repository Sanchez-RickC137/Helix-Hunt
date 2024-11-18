const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;
const { downloadFile, scrapeFileList } = require('./downloader');
const { processSingleFile } = require('./processor');
const { updateGeneCounts } = require('./geneCount.service');
const Logger = require('./utils/logger');
const MD5Verifier = require('./utils/md5Verifier');
const timeOperation = require('./utils/timing');

// Configuration
const BASE_DIR = path.join(__dirname, '../../');
const DIRECTORIES = {
  download: path.join(BASE_DIR, 'data/downloads'),
  temp: path.join(BASE_DIR, 'data/temp')
};

// Files in processing order
const PROCESS_FILES = [
  'variant_summary.txt.gz',
  'submission_summary.txt.gz',
  'summary_of_conflicting_interpretations.txt',
  'hgvs4variation.txt.gz'
];

// Track active processes and locks
const ACTIVE_PROCESSES = new Map();
const FILE_LOCKS = new Map();

class FileLock {
  constructor(fileName) {
    this.fileName = fileName;
    this.isLocked = false;
    this.queue = [];
  }

  async acquire() {
    if (this.isLocked) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.isLocked = true;
  }

  release() {
    this.isLocked = false;
    const next = this.queue.shift();
    if (next) next();
  }
}

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

async function processFile(pool, fileInfo, logger) {
  const fileName = fileInfo.fileName;

  // Get or create lock for this file
  if (!FILE_LOCKS.has(fileName)) {
    FILE_LOCKS.set(fileName, new FileLock(fileName));
  }
  const lock = FILE_LOCKS.get(fileName);

  if (ACTIVE_PROCESSES.has(fileName)) {
    logger.log(`File ${fileName} is already being processed, skipping...`);
    return;
  }

  try {
    await lock.acquire();
    ACTIVE_PROCESSES.set(fileName, new Date());

    const md5Verifier = new MD5Verifier();
    const stats = {};

    // Ensure clean state
    const downloadPath = path.join(DIRECTORIES.download, fileName);
    const decompressedPath = path.join(DIRECTORIES.temp, 
      fileName.endsWith('.gz') ? fileName.replace('.gz', '') : fileName
    );

    // Clean any existing files
    await fs.unlink(downloadPath).catch(() => {});
    await fs.unlink(decompressedPath).catch(() => {});

    logger.log(`Processing ${fileName}...`);

    // Download file
    await downloadFile(fileInfo.url, downloadPath);

    // Verify MD5
    const isValid = await md5Verifier.verifyFile(fileInfo.url, downloadPath, logger);
    if (!isValid) {
      throw new Error(`MD5 verification failed for ${fileName}`);
    }

    // Decompress file
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
      processedPath: decompressedPath
    }, DIRECTORIES, logger);
    const loadEnd = process.hrtime.bigint();
    stats.loadTime = Number(loadEnd - loadStart) / 1_000_000_000;

    // Get stats
    const fileStats = await fs.stat(decompressedPath);
    stats.totalLines = fileStats.size;
    stats.duration = stats.loadTime;

    // Cleanup files
    await timeOperation('Cleanup', async () => {
      await fs.unlink(decompressedPath).catch(error => 
        logger.log(`Error cleaning up decompressed file: ${error.message}`, 'warning')
      );
      await fs.unlink(downloadPath).catch(error => 
        logger.log(`Error cleaning up downloaded file: ${error.message}`, 'warning')
      );
    });

    return stats;
  } catch (error) {
    logger.log(`Error processing ${fileName}: ${error.message}`, 'error');
    throw error;
  } finally {
    ACTIVE_PROCESSES.delete(fileName);
    lock.release();
  }
}

async function processAllFiles(pool) {
  const logger = new Logger();
  const summary = new ProcessingSummary();

  try {
    logger.log('Starting file processing');

    // Ensure directories exist
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });

    // Get file list from ClinVar
    const files = await scrapeFileList();
    const orderedFiles = PROCESS_FILES.map(fileName => 
      files.find(f => f.fileName === fileName)
    ).filter(Boolean);

    // Process each file sequentially
    for (const fileInfo of orderedFiles) {
      try {
        logger.log(`Starting processing of ${fileInfo.fileName}`);
        const stats = await processFile(pool, fileInfo, logger);
        summary.addProcessingResult(fileInfo.fileName, stats);
        logger.log(`Successfully processed ${fileInfo.fileName}`);
      } catch (error) {
        summary.addError(`Processing failed for ${fileInfo.fileName}: ${error.message}`);
        logger.log(`Failed to process ${fileInfo.fileName}: ${error.message}`, 'error');
      }
    }

    // Update gene counts after files are processed
    try {
      logger.log('Starting gene count update');
      await updateGeneCounts();
      logger.log('Successfully updated gene counts');
    } catch (error) {
      summary.addError(`Gene count update failed: ${error.message}`);
      logger.log(`Failed to update gene counts: ${error.message}`, 'error');
    }

    // Send summary email
    await logger.sendEmail(
      'ClinVar Update', 
      summary.totalStats.errors.length === 0,
      summary.formatSummaryEmail()
    );

  } catch (error) {
    summary.addError(`Fatal error in batch processing: ${error.message}`);
    logger.log(`Fatal error in batch processing: ${error.message}`, 'error');
    await logger.sendEmail(
      'ClinVar Update', 
      false,
      summary.formatSummaryEmail()
    );
  }
}

function initializeSchedules(pool, logger) {
  // Single weekly update - Saturday at 21:57
  schedule.scheduleJob('57 21 * * 6', async () => {
    logger.log('Starting weekly ClinVar update process');
    await processAllFiles(pool);
  });

  // Daily health check
  schedule.scheduleJob('0 9 * * *', () => {
    const schedules = schedule.scheduledJobs;
    logger.log(`Health check: ${Object.keys(schedules).length} scheduled jobs active`);
    logger.log(`Active processes: ${Array.from(ACTIVE_PROCESSES.keys()).join(', ')}`);
    Object.entries(schedules).forEach(([name, job]) => {
      logger.log(`Next run for ${name}: ${job.nextInvocation()}`);
    });
  });
}

async function initializeScheduler(pool) {
  const logger = new Logger();
  try {
    await fs.mkdir(DIRECTORIES.download, { recursive: true });
    await fs.mkdir(DIRECTORIES.temp, { recursive: true });

    initializeSchedules(pool, logger);
    logger.log('Scheduler initialized successfully');

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
  DIRECTORIES
};