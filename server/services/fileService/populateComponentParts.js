const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');

// Load environment variables if running standalone
if (require.main === module) {
  dotenv.config({ path: path.join(__dirname, '../../../.env') });
}

// Define log file path
const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE_PATH = path.join(LOG_DIR, 'componentPartFailures.log');

// Ensure log directory exists
fs.mkdir(LOG_DIR, { recursive: true }, (err) => {
  if (err && err.code !== 'EEXIST') {
    console.error('Error creating logs directory:', err);
  }
});

function logFailure(reason, fullName) {
  const logMessage = `[${new Date().toISOString()}] Reason: ${reason} | Variant Name: ${fullName}\n`;
  fs.appendFile(LOG_FILE_PATH, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}

/**
 * Processes variant records in smaller chunks with controlled resource usage
 */
async function populateComponentParts(existingPool = null, logger = console) {
  let pool = existingPool;
  let connection;

  try {
    // Create pool if not provided (standalone mode)
    if (!pool) {
      pool = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }

    connection = await pool.getConnection();
    const CHUNK_SIZE = 10000; // Increased chunk size
    const PROCESSING_DELAY = 10; // Reduced delay
    const startTime = performance.now();
    let processedCount = 0;
    let insertedCount = 0;

    // Create table with optimized settings
    await connection.query(`
      CREATE TABLE IF NOT EXISTS component_parts (
        variation_id VARCHAR(255) NOT NULL,
        gene_symbol VARCHAR(255),
        transcript_id VARCHAR(255),
        dna_change TEXT,
        protein_change TEXT,
        PRIMARY KEY (variation_id),
        INDEX idx_gene_symbol (gene_symbol),
        INDEX idx_transcript_id (transcript_id)
      ) ENGINE=InnoDB
    `);

    // Configure for bulk operations
    await connection.query('SET foreign_key_checks = 0');
    await connection.query('SET unique_checks = 0');
    await connection.query('TRUNCATE TABLE component_parts');

    logger.log('Processing records in chunks...');

    let lastId = '0';
    const seenIds = new Set();
    let batchValues = [];

    // Process in batches with fewer transactions
    while (true) {
      // More efficient query with NM_ filter in WHERE clause
      const [records] = await connection.query(
        'SELECT DISTINCT Name, VariationID FROM variant_summary ' +
        'WHERE Name LIKE "NM_%' + 
        '" AND VariationID > ? ' +
        'ORDER BY VariationID LIMIT ?',
        [lastId, CHUNK_SIZE]
      );

      if (records.length === 0) break;
      lastId = records[records.length - 1].VariationID;

      for (const record of records) {
        if (seenIds.has(record.VariationID)) continue;

        const components = parseVariantName(record.Name);
        if (components && 
            components.geneSymbol && 
            components.dnaChange && 
            components.transcriptId) {

          batchValues.push([
            record.VariationID,
            components.geneSymbol,
            components.transcriptId,
            components.dnaChange,
            components.proteinChange || null
          ]);
          seenIds.add(record.VariationID);
        }
      }

      processedCount += records.length;

      // Insert in larger batches
      if (batchValues.length >= CHUNK_SIZE) {
        await connection.query(
          'INSERT IGNORE INTO component_parts ' +
          '(variation_id, gene_symbol, transcript_id, dna_change, protein_change) ' +
          'VALUES ?',
          [batchValues]
        );
        insertedCount += batchValues.length;
        batchValues = [];
        
        // Log progress less frequently
        if (processedCount % 100000 === 0) {
          const duration = (performance.now() - startTime) / 1000;
          logger.log(`Processed ${processedCount.toLocaleString()} records in ${duration.toFixed(2)}s`);
          logger.log(`Inserted ${insertedCount.toLocaleString()} unique records`);
        }

        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
      }
    }

    // Insert any remaining records
    if (batchValues.length > 0) {
      await connection.query(
        'INSERT IGNORE INTO component_parts ' +
        '(variation_id, gene_symbol, transcript_id, dna_change, protein_change) ' +
        'VALUES ?',
        [batchValues]
      );
      insertedCount += batchValues.length;
    }

    // Restore settings
    await connection.query('SET foreign_key_checks = 1');
    await connection.query('SET unique_checks = 1');

    const duration = (performance.now() - startTime) / 1000;
    logger.log(`Component parts population completed in ${duration.toFixed(2)} seconds`);
    logger.log(`Total processed: ${processedCount.toLocaleString()}`);
    logger.log(`Total inserted: ${insertedCount.toLocaleString()}`);

    return { processedCount, insertedCount, duration };

  } catch (error) {
    logger.log('Error during component parts population:', error);
    throw error;
  } finally {
    if (connection) connection.release();
    if (!existingPool && pool) {
      await pool.end();
    }
  }
}


function parseVariantName(fullName) {
  if (!fullName) {
    logFailure('Empty or null fullName', fullName);
    return null;
  }

  if (!fullName.includes(':') || !fullName.includes('(') || !fullName.includes(')') || !fullName.startsWith('NM_')) {
    logFailure('Invalid format - missing required structure', fullName);
    return null;
  }

  try {
    const transcriptAndGene = fullName.match(/^([^:]+)\(([^)]+)\)/);
    if (!transcriptAndGene || transcriptAndGene.length < 3) {
      logFailure('Invalid format - could not extract transcript ID and gene symbol', fullName);
      return null;
    }

    const transcriptId = transcriptAndGene[1].trim();
    const geneSymbol = transcriptAndGene[2].trim();
    if (!geneSymbol || !transcriptId) {
      logFailure('Invalid geneSymbol or transcriptId', fullName);
      return null;
    }

    const dnaChangeMatch = fullName.match(/:(c\.[^ ]+)/);
    if (!dnaChangeMatch || dnaChangeMatch.length < 2) {
      logFailure('Missing or invalid DNA change', fullName);
      return null;
    }

    const dnaChange = dnaChangeMatch[1].trim();

    const proteinChangeMatch = fullName.match(/\(p\.[^)]+\)$/);
    const proteinChange = proteinChangeMatch ? proteinChangeMatch[0].replace(/[()]/g, '').trim() : null;

    return {
      geneSymbol,
      transcriptId,
      dnaChange,
      proteinChange
    };
  } catch (error) {
    logFailure(`Parsing error: ${error.message}`, fullName);
    console.error('Error parsing variant name:', error);
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  populateComponentParts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = {
  populateComponentParts,
  parseVariantName
};