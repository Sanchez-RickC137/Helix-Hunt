const { Pool } = require('pg');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const copyFrom = require('pg-copy-streams').from;
const through2 = require('through2');
const format = require('pg-format');

class FileProcessor {
  constructor(pool) {
    this.pool = pool;
  }

  async processFile(filePath, tableName, options = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create temp table
      const tempTableName = `temp_${tableName}_${Date.now()}`;
      await client.query(format('CREATE TEMP TABLE %I (LIKE %I INCLUDING ALL)', tempTableName, tableName));

      // Create read stream with transformation
      const fileStream = fs.createReadStream(filePath)
        .pipe(through2(function(chunk, enc, callback) {
          // Transform chunk if needed
          callback(null, chunk);
        }));

      // Copy to temp table
      const copyStream = client.query(copyFrom(`
        COPY ${tempTableName} FROM STDIN WITH (
          FORMAT csv,
          DELIMITER E'\\t',
          NULL '',
          HEADER true
        )
      `));

      await pipeline(fileStream, copyStream);

      // Validate data in temp table
      const { rows: [validation] } = await client.query(`
        SELECT COUNT(*) as total_rows,
               COUNT(*) FILTER (WHERE variationid IS NULL) as null_ids,
               COUNT(DISTINCT variationid) as unique_ids
        FROM ${tempTableName}
      `);

      if (validation.null_ids > 0) {
        throw new Error(`Found ${validation.null_ids} rows with null IDs`);
      }

      // Perform atomic table swap
      await client.query('ALTER TABLE ' + tableName + ' RENAME TO ' + tableName + '_old');
      await client.query('ALTER TABLE ' + tempTableName + ' RENAME TO ' + tableName);
      await client.query('DROP TABLE ' + tableName + '_old');

      // Update indexes
      if (options.createIndexes) {
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${tableName}_variation_id_idx 
          ON ${tableName}(variationid);
          
          CREATE INDEX IF NOT EXISTS ${tableName}_gene_symbol_idx 
          ON ${tableName}(genesymbol);
          
          CREATE INDEX IF NOT EXISTS ${tableName}_clinical_significance_idx 
          ON ${tableName}(clinicalsignificance);
        `);
      }

      // Analyze the new table
      await client.query('ANALYZE ' + tableName);

      await client.query('COMMIT');

      return {
        success: true,
        totalRows: validation.total_rows,
        uniqueIds: validation.unique_ids
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processBatch(items, tableName, batchSize = 1000) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const values = batch.map(item => Object.values(item));
        const columns = Object.keys(batch[0]);

        const query = format(
          `INSERT INTO %I (%s) VALUES %L ON CONFLICT DO NOTHING`,
          tableName,
          columns.join(', '),
          values
        );

        await client.query(query);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async exportToFile(query, outputPath, options = {}) {
    const client = await this.pool.connect();
    try {
      const outputStream = fs.createWriteStream(outputPath);
      
      // Write headers if requested
      if (options.includeHeaders) {
        outputStream.write(options.headers.join('\t') + '\n');
      }

      // Stream results to file
      const cursor = client.query(new Cursor(query));
      let rows;
      do {
        rows = await cursor.read(1000);
        if (rows.length > 0) {
          const formattedRows = rows.map(row => 
            Object.values(row).join('\t')
          ).join('\n');
          outputStream.write(formattedRows + '\n');
        }
      } while (rows.length > 0);

      outputStream.end();
    } finally {
      client.release();
    }
  }

  async validateData(tableName) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT 
          COUNT(*) as total_rows,
          COUNT(DISTINCT variationid) as unique_variants,
          COUNT(*) FILTER (WHERE variationid IS NULL) as null_variants,
          COUNT(*) FILTER (WHERE genesymbol IS NULL) as null_genes,
          MIN(datelastevaluated) as earliest_date,
          MAX(datelastevaluated) as latest_date
        FROM ${tableName}
      `);

      return rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = FileProcessor;