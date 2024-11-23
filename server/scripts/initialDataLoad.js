const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { pipeline } = require('stream/promises');
const copyFrom = require('pg-copy-streams').from;
const fsSync = require('fs');
const zlib = require('zlib');
const axios = require('axios');
const Logger = require('../services/fileService/utils/logger');
const { Transform } = require('stream');
const readline = require('readline');
const { populateComponentParts } = require('./populateComponentParts');

require('dotenv').config();

const BASE_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/';
const REQUIRED_FILES = [
  'variant_summary.txt.gz',
  'submission_summary.txt.gz'
];

const DIRECTORIES = {
  download: path.join(__dirname, '../data/downloads'),
  temp: path.join(__dirname, '../data/temp'),
  logs: path.join(__dirname, '../logs')
};

// Function to download files and log progress
async function downloadFile(url, outputPath, logger) {
  logger.log(`Downloading file from ${url}`);
  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const writer = fsSync.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      logger.log(`Finished downloading ${path.basename(outputPath)}`);
      resolve();
    });
    writer.on('error', reject);
  });
}

// Function to decompress files and log progress
async function decompressFile(inputPath, outputPath, logger) {
  logger.log(`Decompressing file: ${inputPath}`);
  await pipeline(
    fsSync.createReadStream(inputPath),
    zlib.createGunzip(),
    fsSync.createWriteStream(outputPath)
  );
  logger.log(`Finished decompressing to: ${outputPath}`);
}

async function processSubmissionSummary(client, processedPath, logger) {
  logger.log('Processing submission_summary with chunked loading');
  
  try {
    await client.query('BEGIN');
    
    // Create the table
    await client.query(`DROP TABLE IF EXISTS submission_summary_temp`);
    await client.query(`
      CREATE TABLE submission_summary_temp (
        VariationID TEXT,
        ClinicalSignificance TEXT,
        DateLastEvaluated TEXT,
        Description TEXT,
        SubmittedPhenotypeInfo TEXT,
        ReportedPhenotypeInfo TEXT,
        ReviewStatus TEXT,
        CollectionMethod TEXT,
        OriginCounts TEXT,
        Submitter TEXT,
        SCV TEXT,
        SubmittedGeneSymbol TEXT,
        ExplanationOfInterpretation TEXT,
        SomaticClinicalImpact TEXT,
        Oncogenicity TEXT
      )
    `);
    
    logger.log('Created submission_summary_temp table');

    // Process file in chunks
    const rl = readline.createInterface({
      input: fsSync.createReadStream(processedPath, { encoding: 'utf8' }),
      crlfDelay: Infinity
    });

    let isHeader = true;
    let headerLine = '';
    let batch = [];
    const BATCH_SIZE = 10000;
    let totalRows = 0;

    for await (let line of rl) {
      // Skip comment lines
      if (line.startsWith('#')) {
        if (line.startsWith('#VariationID')) {
          headerLine = line.slice(1); // Remove the # from header
          isHeader = false;
        }
        continue;
      }

      if (!isHeader && line.trim()) {
        batch.push(line);
        
        if (batch.length >= BATCH_SIZE) {
          // Create temporary file for this batch
          const batchFile = path.join(DIRECTORIES.temp, `batch_${totalRows}.txt`);
          await fs.writeFile(batchFile, headerLine + '\n' + batch.join('\n') + '\n');

          // Load batch into database
          const stream = client.query(copyFrom(`
            COPY submission_summary_temp FROM STDIN WITH (
              FORMAT csv,
              DELIMITER E'\\t',
              NULL '',
              HEADER
            )
          `));

          await pipeline(
            fsSync.createReadStream(batchFile),
            stream
          );

          totalRows += batch.length;
          logger.log(`Processed ${totalRows} rows of submission_summary`);

          // Clean up batch file
          await fs.unlink(batchFile);
          
          // Clear batch
          batch = [];
        }
      }
    }

    // Process final batch if any
    if (batch.length > 0) {
      const batchFile = path.join(DIRECTORIES.temp, `batch_final.txt`);
      await fs.writeFile(batchFile, headerLine + '\n' + batch.join('\n') + '\n');

      const stream = client.query(copyFrom(`
        COPY submission_summary_temp FROM STDIN WITH (
          FORMAT csv,
          DELIMITER E'\\t',
          NULL '',
          HEADER
        )
      `));

      await pipeline(
        fsSync.createReadStream(batchFile),
        stream
      );

      totalRows += batch.length;
      await fs.unlink(batchFile);
    }

    logger.log(`Total rows processed: ${totalRows}`);

    // Rename temp table to final
    await client.query('DROP TABLE IF EXISTS submission_summary');
    await client.query('ALTER TABLE submission_summary_temp RENAME TO submission_summary');

    await client.query('COMMIT');
    logger.log('Submission summary processing completed');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}


const BATCH_SIZE = 50000; // Increase batch size but not too much

async function insertBatch(client, tableName, rows, logger) {
  logger.log(`Starting batch insert of ${rows.length} rows...`);

  return new Promise((resolve, reject) => {
    const stream = client.query(copyFrom(`
      COPY ${tableName}_temp FROM STDIN WITH (
        FORMAT text,
        DELIMITER E'\\t'
      )
    `));

    stream.on('error', reject);
    stream.on('finish', resolve);

    let rowsProcessed = 0;

    for (const row of rows) {
      // Split row into fields and handle each field
      const fields = row.split('\t').map(field => {
        // If field contains quotes or special characters, escape it
        if (field.includes('"') || field.includes('\t') || field.includes('\n') || field.includes('\\')) {
          // Escape backslashes first
          field = field.replace(/\\/g, '\\\\');
          // Escape quotes
          field = field.replace(/"/g, '\\"');
          return field;
        }
        return field;
      });

      stream.write(fields.join('\t') + '\n');
      rowsProcessed++;
      
      if (rowsProcessed % 5000 === 0) {
        logger.log(`Written ${rowsProcessed} rows to stream...`);
      }
    }

    stream.end();
  });
}

// Function to create and populate the component_parts table
async function processFile(client, fileName, processedPath, logger) {
  logger.log(`Processing ${fileName} for database import`);
  const tableName = fileName.includes('variant') ? 'variant_summary' : 'submission_summary';
  const BATCH_SIZE = 25000;

  try {
    logger.log('Beginning transaction...');
    await client.query('BEGIN');
    await client.query('SET maintenance_work_mem = \'1GB\'');
    await client.query('SET temp_buffers = \'1GB\'');
    
    logger.log(`Dropping existing ${tableName}_temp if exists...`);
    await client.query(`DROP TABLE IF EXISTS ${tableName}_temp`);

    if (tableName === 'submission_summary') {
      await client.query(`
        CREATE TABLE ${tableName}_temp (
          VariationID TEXT,
          ClinicalSignificance TEXT,
          DateLastEvaluated TEXT,
          Description TEXT,
          SubmittedPhenotypeInfo TEXT,
          ReportedPhenotypeInfo TEXT,
          ReviewStatus TEXT,
          CollectionMethod TEXT,
          OriginCounts TEXT,
          Submitter TEXT,
          SCV TEXT,
          SubmittedGeneSymbol TEXT,
          ExplanationOfInterpretation TEXT,
          SomaticClinicalImpact TEXT,
          Oncogenicity TEXT
        )
      `);
      logger.log(`Created temporary table: ${tableName}_temp`);

      const readStream = fsSync.createReadStream(processedPath, { 
        encoding: 'utf8',
        highWaterMark: 1024 * 1024
      });
      
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
      });

      let buffer = [];
      let rowCount = 0;
      let isHeaderFound = false;
      let lineCount = 0;

      for await (const line of rl) {
        lineCount++;
        if (lineCount % 10000 === 0) {
          logger.log(`Processed ${lineCount} lines...`);
        }

        if (line.startsWith('#VariationID')) {
          isHeaderFound = true;
          logger.log('Found header line, starting data processing...');
          continue;
        }

        if (!line.startsWith('#') && isHeaderFound && line.trim()) {
          buffer.push(line);

          if (buffer.length >= BATCH_SIZE) {
            logger.log(`Buffer reached ${BATCH_SIZE} rows, inserting batch...`);
            await insertBatch(client, tableName, buffer, logger);
            rowCount += buffer.length;
            buffer = [];
            logger.log(`Inserted ${rowCount} rows into ${tableName}_temp...`);
          }
        }
      }

      if (buffer.length > 0) {
        logger.log(`Processing final batch of ${buffer.length} rows...`);
        await insertBatch(client, tableName, buffer, logger);
        rowCount += buffer.length;
        logger.log(`Inserted final ${buffer.length} rows. Total: ${rowCount}`);
      }

    } else {
      let headers = [];
      const headerStream = fsSync.createReadStream(processedPath, {
        encoding: 'utf8',
        end: 1024,
      });

      for await (const chunk of headerStream) {
        headers = chunk.split('\n')[0].split('\t');
        break;
      }

      logger.log(`Extracted ${headers.length} headers from ${fileName}`);

      await client.query(`
        CREATE TABLE ${tableName}_temp (${headers.map(col => `"${col}" TEXT`).join(', ')})
      `);

      const readStream = fsSync.createReadStream(processedPath, { 
        encoding: 'utf8',
        highWaterMark: 1024 * 1024
      });
      
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
      });

      let buffer = [];
      let rowCount = 0;
      let isFirst = true;

      for await (const line of rl) {
        if (isFirst) {
          isFirst = false;
          continue;
        }

        buffer.push(line);

        if (buffer.length >= BATCH_SIZE) {
          await insertBatch(client, tableName, buffer, logger);
          rowCount += buffer.length;
          buffer = [];
          logger.log(`Inserted ${rowCount} rows into ${tableName}_temp...`);
        }
      }

      if (buffer.length > 0) {
        await insertBatch(client, tableName, buffer, logger);
        rowCount += buffer.length;
        logger.log(`Inserted final ${buffer.length} rows. Total: ${rowCount}`);
      }
    }

    if (tableName === 'submission_summary') {
      await client.query('CREATE INDEX ON submission_summary_temp (VariationID)');
    }

    await client.query(`DROP TABLE IF EXISTS ${tableName}`);
    await client.query(`ALTER TABLE ${tableName}_temp RENAME TO ${tableName}`);

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.query('RESET maintenance_work_mem');
    await client.query('RESET temp_buffers');
  }
}

async function trimTables(client, logger) {
  try {
    logger.log('Starting table optimization');
    await client.query('BEGIN');

    // Trim variant_summary
    // logger.log('Creating optimized variant_summary');
    // await client.query(`
    //   CREATE TABLE variant_summary_optimized AS
    //   SELECT 
    //     "Name",
    //     "GeneSymbol",
    //     "VariationID",
    //     "ClinicalSignificance",
    //     "LastEvaluated",
    //     "ReviewStatus",
    //     "RCVaccession"
    //   FROM variant_summary
    // `);

    // // Replace original table
    // await client.query('DROP TABLE variant_summary');
    // await client.query('ALTER TABLE variant_summary_optimized RENAME TO variant_summary');

    // Trim submission_summary
    logger.log('Creating optimized submission_summary');
    await client.query(`
      CREATE TABLE submission_summary_optimized AS
      SELECT 
        "VariationID",
        "ClinicalSignificance",
        "DateLastEvaluated",
        "Description",
        "ReviewStatus",
        "CollectionMethod",
        "Submitter",
        "SCV"
      FROM submission_summary
    `);

    // Replace original table
    await client.query('DROP TABLE submission_summary');
    await client.query('ALTER TABLE submission_summary_optimized RENAME TO submission_summary');

    await client.query('COMMIT');
    logger.log('Table optimization completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Function to ensure all directories exist
async function ensureDirectories() {
  await Promise.all(Object.values(DIRECTORIES).map(dir => fs.mkdir(dir, { recursive: true })));
}

async function createInitialGeneCounts(client, logger) {
  try {
    logger.log('Creating initial gene_variant_counts from Gene_Symbol.txt');
    await client.query('BEGIN');

    // Drop and recreate table
    await client.query('DROP TABLE IF EXISTS gene_variant_counts CASCADE');
    await client.query(`
      CREATE TABLE gene_variant_counts (
        gene_symbol TEXT PRIMARY KEY,
        variant_count INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read and clean gene symbols file
    const filePath = path.join(__dirname, '../../public/data/Gene_Symbol.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const geneSymbols = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.includes('('))  // Remove empty lines and any with parentheses
      .filter(Boolean);

    logger.log(`Found ${geneSymbols.length} valid gene symbols to process`);

    // Insert all genes with count 0
    const insertQuery = `
      INSERT INTO gene_variant_counts (gene_symbol, variant_count, last_updated)
      VALUES ($1, 0, CURRENT_TIMESTAMP)
    `;

    for (const gene of geneSymbols) {
      await client.query(insertQuery, [gene]);
      logger.log(`Inserted gene ${gene} with initial count 0`);
    }

    await client.query('COMMIT');
    logger.log(`Completed initial gene_variant_counts setup with ${geneSymbols.length} entries`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function executeSearch(gene, useGeneTag = true) {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  const searchTerm = useGeneTag ? `${gene}[gene]` : gene;
  const url = `${baseUrl}?db=clinvar&term=${searchTerm}&retmax=25000`;
  
  try {
    const response = await axios.get(url);
    const countMatch = response.data.match(/<Count>(\d+)<\/Count>/);
    return countMatch ? parseInt(countMatch[1]) : 0;
  } catch (error) {
    console.error(`Error searching for gene ${gene}:`, error);
    return 0;
  }
}

async function updateGeneCountsFromAPI(client, logger) {
  try {
    logger.log('Starting API-based gene count updates');
    
    const { rows: genes } = await client.query('SELECT gene_symbol FROM gene_variant_counts');
    logger.log(`Found ${genes.length} genes to update`);

    for (const gene of genes) {
      try {
        // Try with gene tag first
        let count = await executeSearch(gene.gene_symbol, true);
        
        // If no results, try without tag
        if (count === 0) {
          logger.log(`Zero results with [gene] tag for ${gene.gene_symbol}, retrying...`);
          count = await executeSearch(gene.gene_symbol, false);
        }

        // Update count in database
        await client.query(`
          UPDATE gene_variant_counts 
          SET variant_count = $1, last_updated = CURRENT_TIMESTAMP 
          WHERE gene_symbol = $2
        `, [count, gene.gene_symbol]);

        logger.log(`Updated ${gene.gene_symbol} count to ${count}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        logger.log(`Error updating count for ${gene.gene_symbol}: ${error.message}`, 'error');
      }
    }

    logger.log('Completed API-based gene count updates');
  } catch (error) {
    throw error;
  }
}


async function postProcessVariantSummary(client, logger) {
  try {
    logger.log('Starting post-processing of variant_summary table');
    
    // Create slimmed down version of variant_summary
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE variant_summary_slim AS
      SELECT 
        Name, GeneSymbol, VariationID, ClinicalSignificance,
        LastEvaluated, ReviewStatus, RCVaccession
      FROM variant_summary;
    `);
    
    // Replace original with slim version
    await client.query('DROP TABLE variant_summary');
    await client.query('ALTER TABLE variant_summary_slim RENAME TO variant_summary');
    await client.query('COMMIT');
    
    logger.log('Successfully trimmed variant_summary table');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Helper function to parse variant names
function parseVariantName(fullName) {
  if (!fullName || !fullName.includes(':') || !fullName.includes('(') || 
      !fullName.includes(')') || !fullName.startsWith('NM_')) {
    return null;
  }

  try {
    const transcriptAndGene = fullName.match(/^([^:]+)\(([^)]+)\)/);
    if (!transcriptAndGene || transcriptAndGene.length < 3) return null;

    const transcriptId = transcriptAndGene[1].trim();
    const geneSymbol = transcriptAndGene[2].trim();
    
    const dnaChangeMatch = fullName.match(/:(c\.[^ ]+)/);
    if (!dnaChangeMatch || dnaChangeMatch.length < 2) return null;
    
    const dnaChange = dnaChangeMatch[1].trim();
    const proteinChangeMatch = fullName.match(/\(p\.[^)]+\)$/);
    const proteinChange = proteinChangeMatch ? 
      proteinChangeMatch[0].replace(/[()]/g, '').trim() : 
      null;

    return {
      geneSymbol,
      transcriptId,
      dnaChange,
      proteinChange
    };
  } catch (error) {
    return null;
  }
}

async function trimTables(client, logger) {
  try {
    logger.log('Starting table optimization');
    await client.query('BEGIN');

    // Trim variant_summary
    logger.log('Creating optimized variant_summary');
    await client.query(`
      CREATE TABLE variant_summary_optimized AS
      SELECT 
        "Name",
        "GeneSymbol",
        "VariationID",
        "ClinicalSignificance",
        "LastEvaluated",
        "ReviewStatus",
        "RCVaccession"
      FROM variant_summary
    `);

    // Replace original table
    await client.query('DROP TABLE variant_summary');
    await client.query('ALTER TABLE variant_summary_optimized RENAME TO variant_summary');

    // Trim submission_summary
    logger.log('Creating optimized submission_summary');
    await client.query(`
      CREATE TABLE submission_summary_optimized AS
      SELECT 
        "VariationID",
        "ClinicalSignificance",
        "DateLastEvaluated",
        "Description",
        "ReportedPhenotypeInfo",
        "ReviewStatus",
        "CollectionMethod",
        "Submitter",
        "SCV"
      FROM submission_summary
    `);

    // Replace original table
    await client.query('DROP TABLE submission_summary');
    await client.query('ALTER TABLE submission_summary_optimized RENAME TO submission_summary');

    await client.query('COMMIT');
    logger.log('Table optimization completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Main function to orchestrate the initial data load
async function initialDataLoad() {
  const logger = new Logger();
  const pool = new Pool({
    connectionString: process.env.EXTERNAL_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    logger.log('Starting initial data load...');
    await ensureDirectories();

    const client = await pool.connect();
    try {
      for (const fileName of REQUIRED_FILES) {
        try {
          const downloadPath = path.join(DIRECTORIES.download, fileName);
          const decompressedPath = path.join(DIRECTORIES.temp, fileName.replace('.gz', ''));

          await downloadFile(`${BASE_URL}${fileName}`, downloadPath, logger);
          await decompressFile(downloadPath, decompressedPath, logger);
          await processFile(client, fileName, decompressedPath, logger);

          // Cleanup files after successful processing
          await fs.unlink(downloadPath).catch(err => logger.log(`Error removing ${downloadPath}: ${err.message}`, 'error'));
          await fs.unlink(decompressedPath).catch(err => logger.log(`Error removing ${decompressedPath}: ${err.message}`, 'error'));
          
        } catch (error) {
          logger.log(`Error processing ${fileName}: ${error.message}`, 'error');
          continue;
        }
      }

      // Post-processing with updated component parts
      try {
        await trimTables(client, logger);
        logger.log('Starting component parts population...');
        await populateComponentParts(pool, logger);
        await createInitialGeneCounts(client, logger);
        await updateGeneCountsFromAPI(client, logger);
      } catch (error) {
        logger.log(`Error in post-processing: ${error.message}`, 'error');
      }

      logger.log('Initial data load completed');

    } finally {
      client.release();
    }
  } catch (error) {
    logger.log(`Fatal error: ${error.message}`, 'error');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initialDataLoad()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

module.exports = { initialDataLoad };
