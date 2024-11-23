const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const { pool } = require('../config/database');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class LargeResultHandler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
  }

  async initialize() {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async saveIntermediateResults(results, identifier) {
    const client = await pool.connect();
    try {
      // Store in database instead of files
      const compressedData = await gzip(JSON.stringify(results));
      
      await client.query(`
        INSERT INTO query_chunks (query_id, chunk_number, data, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '1 day')
        ON CONFLICT (query_id, chunk_number) 
        DO UPDATE SET data = $3, expires_at = NOW() + INTERVAL '1 day'
      `, [identifier, 1, compressedData]);

    } catch (error) {
      console.error('Error saving intermediate results:', error);
    } finally {
      client.release();
    }
  }

  async loadIntermediateResults(identifier) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT data 
        FROM query_chunks 
        WHERE query_id = $1 
        AND expires_at > NOW()
        ORDER BY chunk_number
      `, [identifier]);

      if (rows.length === 0) return null;

      const decompressedData = await gunzip(rows[0].data);
      return JSON.parse(decompressedData.toString());
    } catch (error) {
      console.error('Error loading intermediate results:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async cleanup(identifier) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM query_chunks WHERE query_id = $1', [identifier]);
    } catch (error) {
      console.error('Error cleaning up chunks:', error);
    } finally {
      client.release();
    }
  }

  // New method for batch processing
  async processBatch(items, batchSize = 1000, processFunc) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processFunc(batch);
      results.push(...batchResults);
    }
    return results;
  }
}

module.exports = new LargeResultHandler();