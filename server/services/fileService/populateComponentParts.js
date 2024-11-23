require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { performance } = require('perf_hooks');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE_PATH = path.join(LOG_DIR, 'componentPartFailures.log');

// Ensure log directory exists
fs.mkdir(LOG_DIR, { recursive: true }).catch(err => {
  if (err.code !== 'EEXIST') {
    console.error('Error creating logs directory:', err);
  }
});

function logFailure(reason, fullName) {
  const logMessage = `[${new Date().toISOString()}] Reason: ${reason} | Variant Name: ${fullName}\n`;
  fs.appendFile(LOG_FILE_PATH, logMessage).catch(err => 
    console.error('Failed to write to log file:', err)
  );
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
    // Extract transcript ID and gene symbol
    const transcriptAndGene = fullName.match(/^([^:]+)\(([^)]+)\)/);
    if (!transcriptAndGene || transcriptAndGene.length < 3) {
      logFailure('Invalid format - could not extract transcript ID and gene symbol', fullName);
      return null;
    }

    const transcriptId = transcriptAndGene[1].trim();
    // Remove leading '(' if present
    const geneSymbol = transcriptAndGene[2].trim().replace(/^\(/, '');

    if (!geneSymbol || !transcriptId) {
      logFailure('Invalid geneSymbol or transcriptId', fullName);
      return null;
    }

    // Extract DNA change
    const dnaChangeMatch = fullName.match(/:(c\.[^ )]+)/);
    if (!dnaChangeMatch || dnaChangeMatch.length < 2) {
      logFailure('Missing or invalid DNA change', fullName);
      return null;
    }

    const dnaChange = dnaChangeMatch[1].trim();

    // Extract protein change
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

async function populateComponentParts(existingPool = null, logger = console) {
  let pool = existingPool;
  let client;

  try {
    if (!pool) {
      // Matching exactly how initialDataLoad.js creates the pool
      pool = new Pool({
        connectionString: process.env.EXTERNAL_DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
    }

    // Log connection attempt
    logger.log('Attempting database connection...');
    logger.log('Using EXTERNAL_DATABASE_URL:', process.env.EXTERNAL_DATABASE_URL ? 'Defined' : 'Undefined');

    client = await pool.connect();
    logger.log('Successfully connected to database');

    const CHUNK_SIZE = 10000;
    const PROCESSING_DELAY = 10;
    const startTime = performance.now();
    let processedCount = 0;
    let insertedCount = 0;

    // Create component_parts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS component_parts (
        variation_id TEXT PRIMARY KEY,
        gene_symbol TEXT,
        transcript_id TEXT,
        dna_change TEXT,
        protein_change TEXT
      )
    `);

    // Clear existing data
    await client.query('TRUNCATE TABLE component_parts');

    logger.log('Processing records in chunks...');

    let lastId = '0';
    const seenIds = new Set();
    
    while (true) {
      // Get chunk of records
      const { rows: records } = await client.query(
        'SELECT DISTINCT "Name", "VariationID" FROM variant_summary ' +
        'WHERE "Name" LIKE $1 AND "VariationID" > $2 ' +
        'ORDER BY "VariationID" LIMIT $3',
        ['NM_%', lastId, CHUNK_SIZE]
      );

      if (records.length === 0) break;
      lastId = records[records.length - 1].VariationID;

      // Process records
      const valuesToInsert = [];
      for (const record of records) {
        if (seenIds.has(record.VariationID)) continue;

        const components = parseVariantName(record.Name);
        if (components && components.geneSymbol && components.dnaChange && components.transcriptId) {
          valuesToInsert.push([
            record.VariationID,
            components.geneSymbol,
            components.transcriptId,
            components.dnaChange,
            components.proteinChange
          ]);
          seenIds.add(record.VariationID);
        }
      }

      processedCount += records.length;

      // Insert batch if we have values
      if (valuesToInsert.length > 0) {
        const query = `
          INSERT INTO component_parts (variation_id, gene_symbol, transcript_id, dna_change, protein_change)
          VALUES ${valuesToInsert.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(',')}
          ON CONFLICT (variation_id) DO NOTHING
        `;

        const flatValues = valuesToInsert.flat();
        await client.query(query, flatValues);
        insertedCount += valuesToInsert.length;

        if (processedCount % 100000 === 0) {
          const duration = (performance.now() - startTime) / 1000;
          logger.log(`Processed ${processedCount.toLocaleString()} records in ${duration.toFixed(2)}s`);
          logger.log(`Inserted ${insertedCount.toLocaleString()} unique records`);
        }

        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
      }
    }

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_component_parts_gene_symbol ON component_parts(gene_symbol);
      CREATE INDEX IF NOT EXISTS idx_component_parts_transcript_id ON component_parts(transcript_id);
    `);

    const duration = (performance.now() - startTime) / 1000;
    logger.log(`Component parts population completed in ${duration.toFixed(2)} seconds`);
    logger.log(`Total processed: ${processedCount.toLocaleString()}`);
    logger.log(`Total inserted: ${insertedCount.toLocaleString()}`);

    return { processedCount, insertedCount, duration };

  } catch (error) {
    logger.log('Error during component parts population:', error);
    throw error;
  } finally {
    if (client) client.release();
    if (!existingPool && pool) {
      await pool.end();
    }
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