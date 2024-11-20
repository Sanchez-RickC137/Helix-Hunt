const { pool, initializePool } = require('../config/database');
const { processAllFiles } = require('../services/fileService/scheduler');
const Logger = require('../services/fileService/utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Runs a manual update of the ClinVar database
 * Includes proper logging and cleanup
 */
async function runManualUpdate() {
  let dbPool;
  const logger = new Logger();
  
  try {
    logger.log('Starting manual ClinVar update...');

    // Initialize database pool
    logger.log('Initializing database connection...');
    dbPool = await initializePool();
    logger.log('Database connection established');

    // Ensure required directories exist
    const baseDir = path.join(__dirname, '../../');
    const dirs = {
      download: path.join(baseDir, 'data/downloads'),
      temp: path.join(baseDir, 'data/temp'),
      logs: path.join(baseDir, 'logs')
    };

    logger.log('Creating required directories...');
    await Promise.all(
      Object.values(dirs).map(dir => 
        fs.mkdir(dir, { recursive: true })
      )
    );

    // Run the update process
    logger.log('Starting update process...');
    await processAllFiles(dbPool);
    
    logger.log('Manual update completed successfully');
    process.exit(0);
  } catch (error) {
    logger.log(`Fatal error during manual update: ${error.message}`, 'error');
    
    // Try to send error notification email
    try {
      await logger.sendEmail(
        'Manual ClinVar Update', 
        false,
        `Manual update failed with error:\n${error.message}\n\nStack trace:\n${error.stack}`
      );
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError);
    }
    
    process.exit(1);
  } finally {
    // Cleanup database connection
    if (dbPool) {
      logger.log('Closing database connection...');
      await dbPool.end().catch(error => {
        logger.log(`Error closing database connection: ${error.message}`, 'error');
      });
    }
  }
}

// Only run if called directly
if (require.main === module) {
  runManualUpdate();
}

module.exports = { runManualUpdate };