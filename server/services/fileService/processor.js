const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');
const { promisify } = require('util');
const timeOperation = require('./utils/timing');
const Logger = require('./utils/logger');
const MD5Verifier = require('./utils/md5Verifier');

const pipeline = promisify(require('stream').pipeline);

/**
 * Verifies file exists and is readable
 * @param {string} filePath - Path to check
 * @param {Logger} logger - Logger instance
 * @returns {Promise<boolean>} Whether file exists and is readable
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
 * Gets processed file path
 * @param {string} fileName - Original file name
 * @param {string} stage - Processing stage
 * @param {Object} directories - Directory configuration
 * @returns {string} Processed file path
 */
function getProcessedFilePath(fileName, stage, directories) {
  switch (stage) {
    case 'downloaded':
      return path.join(directories.download, fileName);
    case 'decompressed':
      return path.join(directories.temp, fileName.endsWith('.gz') 
        ? fileName.replace('.gz', '') 
        : fileName);
    case 'filtered':
      return path.join(directories.temp, fileName.endsWith('.gz')
        ? fileName.replace('.gz', '.filtered')
        : `${fileName}.filtered`);
    default:
      throw new Error(`Unknown processing stage: ${stage}`);
  }
}

/**
 * Decompresses or copies file to temp directory
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @param {Logger} logger - Logger instance
 */
async function decompressFile(inputPath, outputPath, logger) {
  logger.log(`Processing ${inputPath} to ${outputPath}`);

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

  logger.log('File processing complete');
}

/**
 * Processes single file into database
 * @param {Object} pool - Database connection pool
 * @param {Object} fileInfo - File information
 * @param {Object} directories - Directory paths
 */
async function processSingleFile(pool, fileInfo, directories, logger) {
  // Get the filtered file path
  const filePath = getProcessedFilePath(fileInfo.fileName, 'filtered', directories);

  if (!await verifyFile(filePath, logger)) {
    throw new Error(`File not found or not readable: ${filePath}`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('SET foreign_key_checks = 0');
    await connection.query('SET unique_checks = 0');
    await connection.query('SET autocommit = 0');
    await connection.query('SET GLOBAL local_infile = 1');

    const tableName = fileInfo.fileName
      .replace('.txt.gz', '')
      .replace('.txt', '');

    logger.log(`Loading ${filePath} into ${tableName}...`);
    
    // Use LOAD DATA INFILE with the correct path
    await connection.query(`
      LOAD DATA LOCAL INFILE ?
      INTO TABLE ${tableName}
      FIELDS TERMINATED BY '\t'
      ENCLOSED BY ''
      LINES TERMINATED BY '\n'
      IGNORE 1 LINES
    `, [filePath]);

    await connection.query('COMMIT');

    // Verify row count
    const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    logger.log(`Loaded ${countResult[0].count} rows into ${tableName}`);

    // Restore settings
    await connection.query('SET foreign_key_checks = 1');
    await connection.query('SET unique_checks = 1');
    await connection.query('SET autocommit = 1');

    logger.log(`Successfully processed ${fileInfo.fileName}`);

  } catch (error) {
    logger.log(`Error loading data into ${fileInfo.fileName}: ${error.message}`, 'error');
    throw error;
  } finally {
    connection.release();
  }
}


module.exports = {
  processSingleFile,
  verifyFile,
  getProcessedFilePath
};