const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

const FILE_TABLE_MAP = {
  'variant_summary.txt.gz': 'variant_summary',
  'submission_summary.txt.gz': 'submission_summary',
  'summary_of_conflicting_interpretations.txt': 'conflicting_interpretations',
  'hgvs4variation.txt.gz': 'hgvs_variation'
};

const cleanupQueries = [
  `DELETE FROM submission_summary WHERE VariationID LIKE '#%'`,
  `DELETE FROM hgvs_variation WHERE Symbol LIKE '#%'`
];

/**
 * Process a single file into the database
 */
async function processSingleFile(pool, fileInfo, directories, logger) {
  const { fileName, processedPath } = fileInfo;
  const tableName = FILE_TABLE_MAP[fileName];

  if (!tableName) {
    throw new Error(`No table mapping found for file: ${fileName}`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.query('SET foreign_key_checks = 0');
    await connection.query('SET unique_checks = 0');
    await connection.query('SET autocommit = 0');

    await connection.query(`TRUNCATE TABLE ${tableName}`);

    await connection.query(`
      LOAD DATA LOCAL INFILE ?
      INTO TABLE ${tableName}
      FIELDS TERMINATED BY '\t'
      ENCLOSED BY ''
      LINES TERMINATED BY '\n'
      IGNORE 1 LINES
    `, [processedPath]);

    // Updated cleanup logic
    if (tableName === 'submission_summary') {
      await connection.query(`DELETE FROM ${tableName} WHERE VariationID LIKE '#%'`);
    } else if (tableName === 'hgvs_variation') {
      await connection.query(`DELETE FROM ${tableName} WHERE Symbol LIKE '#%'`);
    }

    await connection.query('COMMIT');
    await connection.query('SET foreign_key_checks = 1');
    await connection.query('SET unique_checks = 1');
    await connection.query('SET autocommit = 1');

  } catch (error) {
    logger.log(`Error loading data into ${tableName}: ${error.message}`, 'error');
    throw error;
  } finally {
    connection.release();
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
    return true;
  } catch (error) {
    logger.log(`File verification failed for ${filePath}: ${error.message}`, 'error');
    return false;
  }
}

module.exports = {
  processSingleFile,
  verifyFile
};