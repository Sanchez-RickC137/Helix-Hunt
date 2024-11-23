const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);
const zlib = require('zlib');
const gunzip = promisify(zlib.gunzip);

const FILE_TABLE_MAP = {
  'variant_summary.txt.gz': 'variant_summary',
  'submission_summary.txt.gz': 'submission_summary',
};

/**
 * Verifies file exists and is readable
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
 * Decompresses a gzipped file
 */
async function decompressFile(inputPath, outputPath) {
  const compressedData = await fs.readFile(inputPath);
  const decompressedData = await gunzip(compressedData);
  await fs.writeFile(outputPath, decompressedData);
}

/**
 * Gets table name mapping for a file
 */
function getTableName(fileName) {
  return FILE_TABLE_MAP[fileName];
}

module.exports = {
  verifyFile,
  decompressFile,
  getTableName
};