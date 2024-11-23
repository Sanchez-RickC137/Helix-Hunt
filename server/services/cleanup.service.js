const { pool } = require('../config/database');

/**
 * Cleanup service for temporary data and expired chunks
 */
const { pool } = require('../config/database');

async function cleanupTemporaryData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete expired chunks with PostgreSQL interval
    await client.query(`
      DELETE FROM query_chunks 
      WHERE expires_at < NOW()
    `);

    // Clean up stale processing statuses
    await client.query(`
      DELETE FROM processing_status 
      WHERE created_at < NOW() - INTERVAL '24 hours'
      AND status IN ('completed', 'failed')
    `);

    // Reset hanging processes
    await client.query(`
      UPDATE processing_status 
      SET status = 'failed', 
          error_message = 'Process timed out'
      WHERE status = 'processing'
      AND updated_at < NOW() - INTERVAL '1 hour'
    `);

    // Vacuum analyze tables to reclaim space and update statistics
    await client.query('VACUUM ANALYZE query_chunks, processing_status');

    await client.query('COMMIT');
    console.log('Cleanup completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during cleanup:', error);
  } finally {
    client.release();
  }
}

module.exports = { cleanupTemporaryData };