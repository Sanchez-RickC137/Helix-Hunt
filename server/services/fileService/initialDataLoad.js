const { pool } = require('../../config/database');
const { processAllFiles } = require('./scheduler');

async function runInitialDataLoad() {
  try {
    console.log('Starting initial data load...');
    await processAllFiles(pool);
    console.log('Initial data load completed');
    process.exit(0);  // Exit successfully
  } catch (error) {
    console.error('Initial data load failed:', error);
    process.exit(1);  // Exit with error
  }
}

// Only run if called directly (not imported)
if (require.main === module) {
  runInitialDataLoad();
}

module.exports = { runInitialDataLoad };