const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');
const rimraf = promisify(require('rimraf'));
const FileProcessor = require('./utils/fileProcessor');
const { downloadFile, scrapeFileList } = require('./downloader');
const { updateGeneCounts } = require('./geneCount.service');
const Logger = require('./utils/logger');
const MD5Verifier = require('./utils/md5Verifier');
const { populateComponentParts } = require('./populateComponentParts');

// Constants
const BASE_DIR = path.join(__dirname, '../../');
const DIRECTORIES = {
  download: path.join(BASE_DIR, 'data/downloads'),
  temp: path.join(BASE_DIR, 'data/temp'),
  logs: path.join(BASE_DIR, 'logs')
};

const REQUIRED_FILES = [
  'variant_summary.txt.gz',
  'submission_summary.txt.gz'
];

const ACTIVE_PROCESSES = new Map();

class SchedulerService {
  constructor(pool) {
    this.pool = pool;
    this.fileProcessor = new FileProcessor(pool);
    this.logger = new Logger();
  }

  async initialize() {
    try {
      // Ensure directories exist
      await Promise.all([
        fs.mkdir(DIRECTORIES.download, { recursive: true }),
        fs.mkdir(DIRECTORIES.temp, { recursive: true }),
        fs.mkdir(DIRECTORIES.logs, { recursive: true })
      ]);

      // Weekly ClinVar update - Saturday at 23:00
      schedule.scheduleJob('0 23 * * 6', async () => {
        this.logger.log('Starting scheduled weekly ClinVar update');
        await this.processAllFiles();
      });

      // Daily health check - 09:00
      schedule.scheduleJob('0 9 * * *', async () => {
        await this.performHealthCheck();
      });

      this.logger.log('Scheduler initialized');
    } catch (error) {
      this.logger.log(`Scheduler initialization failed: ${error.message}`);
      throw error;
    }
  }

  async performHealthCheck() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Cleanup expired data
      await client.query(`
        DELETE FROM query_chunks WHERE expires_at < NOW();
        DELETE FROM processing_status WHERE created_at < NOW() - INTERVAL '24 hours';
      `);

      await client.query('VACUUM ANALYZE');
      await client.query('COMMIT');

      this.logger.log('Health check completed');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.log(`Health check error: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async processAllFiles() {
    try {
      const files = await scrapeFileList();
      const orderedFiles = REQUIRED_FILES
        .map(fileName => files.find(f => f.fileName === fileName))
        .filter(Boolean);

      for (const fileInfo of orderedFiles) {
        try {
          const downloadPath = path.join(DIRECTORIES.download, fileInfo.fileName);
          const processedPath = path.join(DIRECTORIES.temp, fileInfo.fileName.replace('.gz', ''));

          await downloadFile(fileInfo.url, downloadPath);
          
          // Verify MD5
          const md5Verifier = new MD5Verifier();
          if (!(await md5Verifier.verifyFile(fileInfo.url, downloadPath))) {
            throw new Error(`MD5 verification failed for ${fileInfo.fileName}`);
          }

          // Process file
          await this.fileProcessor.processFile(processedPath, fileInfo.fileName.split('.')[0], {
            createIndexes: true
          });

          // Cleanup files
          await Promise.all([
            fs.unlink(downloadPath).catch(() => {}),
            fs.unlink(processedPath).catch(() => {})
          ]);

        } catch (error) {
          this.logger.log(`Error processing ${fileInfo.fileName}: ${error.message}`);
        }
      }

      // Post-processing with updated component parts
      this.logger.log('Starting component parts population...');
      await populateComponentParts(this.pool, this.logger);
      await updateGeneCounts();

      await this.cleanup();

    } catch (error) {
      this.logger.log(`Process error: ${error.message}`);
    }
  }

  async cleanup() {
    try {
      await rimraf(DIRECTORIES.temp);
      await rimraf(DIRECTORIES.download);
      await fs.mkdir(DIRECTORIES.temp, { recursive: true });
      await fs.mkdir(DIRECTORIES.download, { recursive: true });
    } catch (error) {
      this.logger.log(`Cleanup error: ${error.message}`);
    }
  }
}

async function initializeScheduler(pool) {
  const scheduler = new SchedulerService(pool);
  await scheduler.initialize();
  return scheduler;
}

module.exports = {
  initializeScheduler,
  SchedulerService,
  DIRECTORIES
};