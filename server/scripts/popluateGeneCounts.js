const fs = require('fs').promises;
const path = require('path');
const { pool, initializePool } = require('../config/database');

async function populateGeneCounts() {
  let dbPool;
  try {
    console.log('Starting gene counts table population...');
    
    // Initialize database connection
    dbPool = await initializePool();

    // Read the Gene_Symbol.txt file
    const filePath = path.join(__dirname, '../../public/data/Gene_Symbol.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const geneSymbols = fileContent.split('\n')
      .map(line => line.trim())
      .filter(Boolean); // Remove empty lines

    console.log(`Found ${geneSymbols.length} gene symbols to process`);

    // Use a transaction for better performance and atomicity
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert gene symbols with initial count of 0
      const insertQuery = `
        INSERT INTO gene_variant_counts (gene_symbol, variant_count)
        VALUES (?, 0)
        ON DUPLICATE KEY UPDATE gene_symbol = gene_symbol`;

      for (const geneSymbol of geneSymbols) {
        await connection.execute(insertQuery, [geneSymbol]);
      }

      await connection.commit();
      console.log('Successfully populated gene counts table');

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    process.exit(0);
  } catch (error) {
    console.error('Error populating gene counts table:', error);
    process.exit(1);
  } finally {
    if (dbPool) {
      await dbPool.end().catch(console.error);
    }
  }
}

// Only run if called directly
if (require.main === module) {
  populateGeneCounts();
}