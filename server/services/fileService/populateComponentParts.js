const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');

dotenv.config();
// Define log file path
const LOG_FILE_PATH = path.join(__dirname, '../../logs/componentPartFailures.log');

function logFailure(reason, fullName) {
  const logMessage = `[${new Date().toISOString()}] Reason: ${reason} | Variant Name: ${fullName}\n`;
  fs.appendFile(LOG_FILE_PATH, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}

async function populateComponentParts() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const connection = await pool.getConnection();
  const CHUNK_SIZE = 10000;
  const startTime = performance.now();
  let processedCount = 0;
  let insertedCount = 0;

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS component_parts (
        variation_id VARCHAR(255) NOT NULL,
        gene_symbol VARCHAR(255),
        transcript_id VARCHAR(255),
        dna_change TEXT,
        protein_change TEXT,
        PRIMARY KEY (variation_id)
      )
    `);

    await connection.query('TRUNCATE TABLE component_parts');
    console.log('Processing records in chunks...');

    let lastId = '0';
    const seenIds = new Set();

    while (true) {
      const [records] = await connection.query(
        'SELECT DISTINCT Name, VariationID FROM variant_summary WHERE Name LIKE "NM_%" AND VariationID > ? ORDER BY VariationID LIMIT ?',
        [lastId, CHUNK_SIZE]
      );

      if (records.length === 0) break;
      lastId = records[records.length - 1].VariationID;

      const values = [];
      for (const record of records) {
        // Skip if we've seen this ID before
        if (seenIds.has(record.VariationID)) continue;

        const components = parseVariantName(record.Name);
        if (components && 
            components.geneSymbol && 
            components.dnaChange && 
            components.transcriptId) {

          values.push([
            record.VariationID,
            components.geneSymbol,
            components.transcriptId,
            components.dnaChange,
            components.proteinChange || null
          ]);
          seenIds.add(record.VariationID);
        }
      }

      if (values.length > 0) {
        await connection.query(
          'INSERT IGNORE INTO component_parts (variation_id, gene_symbol, transcript_id, dna_change, protein_change) VALUES ?',
          [values]
        );
        insertedCount += values.length;
      }

      processedCount += records.length;
      
      if (processedCount % 50000 === 0) {
        const duration = (performance.now() - startTime) / 1000;
        console.log(`Processed ${processedCount.toLocaleString()} records in ${duration.toFixed(2)}s`);
        console.log(`Inserted ${insertedCount.toLocaleString()} unique records`);
      }
    }

    const duration = (performance.now() - startTime) / 1000;
    console.log(`\nMigration completed in ${duration.toFixed(2)} seconds`);
    console.log(`Total processed: ${processedCount.toLocaleString()}`);
    console.log(`Total inserted: ${insertedCount.toLocaleString()}`);

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
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

module.exports = {
  populateComponentParts
}