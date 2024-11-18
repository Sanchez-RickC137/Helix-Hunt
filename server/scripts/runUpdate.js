const { pool, initializePool } = require('../config/database');
const { processAllFiles } = require('../services/fileService/scheduler');

async function runManualUpdate() {
  let dbPool;
  try {
    console.log('Starting manual ClinVar update...');
    dbPool = await initializePool();
    await processAllFiles(dbPool);
    console.log('Manual update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during manual update:', error);
    process.exit(1);
  } finally {
    if (dbPool) {
      await dbPool.end().catch(console.error);
    }
  }
}

// Only run if called directly
if (require.main === module) {
  runManualUpdate();
}
