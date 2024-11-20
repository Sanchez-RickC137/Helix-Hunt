const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const { populateComponentParts } = require('./populateComponentParts');

const FILE_TABLE_MAP = {
  'variant_summary.txt.gz': 'variant_summary',
  'submission_summary.txt.gz': 'submission_summary',
};

/**
 * Drop unused columns from tables after successful data load
 */
async function optimizeTables(connection, logger) {
  try {
    logger.log('Starting table optimization...');

    // Optimize variant_summary
    await connection.query(`
      ALTER TABLE variant_summary
      DROP COLUMN AlleleID,
      DROP COLUMN Type,
      DROP COLUMN GeneID,
      DROP COLUMN HGNC_ID,
      DROP COLUMN ClinSigSimple,
      DROP COLUMN \`RS#_dbSNP\`,
      DROP COLUMN nsv_esv_dbVar,
      DROP COLUMN PhenotypeIDS,
      DROP COLUMN PhenotypeList,
      DROP COLUMN Origin,
      DROP COLUMN OriginSimple,
      DROP COLUMN Assembly,
      DROP COLUMN ChromosomeAccession,
      DROP COLUMN Chromosome,
      DROP COLUMN Start,
      DROP COLUMN Stop,
      DROP COLUMN ReferenceAllele,
      DROP COLUMN AlternateAllele,
      DROP COLUMN Cytogenetic,
      DROP COLUMN NumberSubmitters,
      DROP COLUMN Guidelines,
      DROP COLUMN TestedInGTR,
      DROP COLUMN OtherIDs,
      DROP COLUMN SubmitterCategories,
      DROP COLUMN PositionVCF,
      DROP COLUMN ReferenceAlleleVCF,
      DROP COLUMN AlternateAlleleVCF
    `);
    logger.log('Optimized variant_summary table');

    // Optimize submission_summary
    await connection.query(`
      ALTER TABLE submission_summary
      DROP COLUMN SubmittedPhenotypeInfo
    `);
    logger.log('Optimized submission_summary table');

    logger.log('Table optimization completed');
  } catch (error) {
    logger.log(`Error during table optimization: ${error.message}`, 'error');
    throw error;
  }
}

let optimizationComplete = false;

async function processSingleFile(pool, fileInfo, directories, logger) {
  const { fileName, processedPath } = fileInfo;
  const tableName = FILE_TABLE_MAP[fileName];
  
  if (!tableName) {
    throw new Error(`No table mapping found for file: ${fileName}`);
  }

  const connection = await pool.getConnection();
  try {
    // Configure database for bulk load
    await connection.query('SET foreign_key_checks = 0');
    await connection.query('SET unique_checks = 0');
    await connection.query('SET autocommit = 0');

    // Drop and recreate table to ensure clean state
    if (tableName === 'variant_summary') {
      await connection.query(`
        DROP TABLE IF EXISTS variant_summary;
        CREATE TABLE variant_summary (
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
        ) ENGINE=InnoDB
      `);
    } else if (tableName === 'submission_summary') {
      await connection.query(`
        DROP TABLE IF EXISTS submission_summary;
        CREATE TABLE submission_summary (
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
        ) ENGINE=InnoDB
      `);
    }

    // Load new data
    await connection.query(`
      LOAD DATA LOCAL INFILE ?
      INTO TABLE ${tableName}
      FIELDS TERMINATED BY '\t'
      ENCLOSED BY ''
      LINES TERMINATED BY '\n'
      IGNORE 1 LINES
    `, [processedPath]);

    // Cleanup data
    if (tableName === 'submission_summary') {
      await connection.query(`DELETE FROM ${tableName} WHERE VariationID LIKE '#%'`);

      // Only optimize and populate after both tables are loaded
      if (!optimizationComplete) {
        // First optimize the tables
        await optimizeTables(connection, logger);
        optimizationComplete = true;

        // Then populate component parts
        logger.log('Waiting 5 seconds before starting component_parts population...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        logger.log('Starting component_parts population...');
        await populateComponentParts(pool, logger);
        logger.log('Component_parts population completed');
      }
    }

    // Commit changes and restore settings
    await connection.query('COMMIT');
    await connection.query('SET foreign_key_checks = 1');
    await connection.query('SET unique_checks = 1');
    await connection.query('SET autocommit = 1');

  } catch (error) {
    logger.log(`Error processing ${tableName}: ${error.message}`, 'error');
    throw error;
  } finally {
    connection.release();
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

module.exports = {
  processSingleFile,
  verifyFile
};