const { pool } = require('../config/database');

/**
 * Cleanup service for temporary data and expired chunks
 */
async function cleanupTemporaryData() {
  const connection = await pool.getConnection();
  try {
    // Delete expired chunks
    await connection.query(`
      DELETE FROM query_chunks 
      WHERE expires_at < NOW()
    `);

    // Clean up stale processing statuses
    await connection.query(`
      DELETE FROM processing_status 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND status IN ('completed', 'failed')
    `);

    // Reset hanging processes
    await connection.query(`
      UPDATE processing_status 
      SET status = 'failed', 
          error_message = 'Process timed out'
      WHERE status = 'processing'
      AND updated_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    connection.release();
  }
}

module.exports = { cleanupTemporaryData };
