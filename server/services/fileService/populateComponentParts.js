const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { performance } = require('perf_hooks');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE_PATH = path.join(LOG_DIR, 'componentPartFailures.log');

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

async function populateComponentParts(existingPool = null, logger = console) {
  let pool = existingPool;
  let client;

  try {
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.EXTERNAL_DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    }

    client = await pool.connect();
    const CHUNK_SIZE = 10000;
    const PROCESSING_DELAY = 10;
    const startTime = performance.now();
    let processedCount = 0;
    let insertedCount = 0;

    await client.query(`
      CREATE TABLE IF NOT EXISTS component_parts (
        variation_id VARCHAR(255) PRIMARY KEY,
        gene_symbol VARCHAR(255),
        transcript_id VARCHAR(255),
        dna_change TEXT,
        protein_change TEXT
      )
    `);

    await client.query('TRUNCATE TABLE component_parts');

    logger.log('Processing records in chunks...');

    let lastId = '0';
    const seenIds = new Set();
    let batchValues = [];

    while (true) {
      const { rows: records } = await client.query(
        'SELECT DISTINCT Name, VariationID FROM variant_summary ' +
        "WHERE Name LIKE 'NM_%' AND VariationID > $1 " +
        'ORDER BY VariationID LIMIT $2',
        [lastId, CHUNK_SIZE]
      );

      if (records.length === 0) break;
      lastId = records[records.length - 1].variationid;

      for (const record of records) {
        if (seenIds.has(record.variationid)) continue;

        const components = parseVariantName(record.name);
        if (components && components.geneSymbol && components.dnaChange && components.transcriptId) {
          batchValues.push(`(
            '${record.variationid}',
            '${components.geneSymbol.replace(/'/g, "''")}',
            '${components.transcriptId.replace(/'/g, "''")}',
            '${components.dnaChange.replace(/'/g, "''")}',
            ${components.proteinChange ? `'${components.proteinChange.replace(/'/g, "''")}'` : 'NULL'}
          )`);
          seenIds.add(record.variationid);
        }
      }

      processedCount += records.length;

      if (batchValues.length >= CHUNK_SIZE) {
        await client.query(`
          INSERT INTO component_parts (variation_id, gene_symbol, transcript_id, dna_change, protein_change)
          VALUES ${batchValues.join(',')}
          ON CONFLICT (variation_id) DO NOTHING
        `);

        insertedCount += batchValues.length;
        batchValues = [];

        if (processedCount % 100000 === 0) {
          const duration = (performance.now() - startTime) / 1000;
          logger.log(`Processed ${processedCount.toLocaleString()} records in ${duration.toFixed(2)}s`);
          logger.log(`Inserted ${insertedCount.toLocaleString()} unique records`);
        }

        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
      }
    }

    if (batchValues.length > 0) {
      await client.query(`
        INSERT INTO component_parts (variation_id, gene_symbol, transcript_id, dna_change, protein_change)
        VALUES ${batchValues.join(',')}
        ON CONFLICT (variation_id) DO NOTHING
      `);
      insertedCount += batchValues.length;
    }

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