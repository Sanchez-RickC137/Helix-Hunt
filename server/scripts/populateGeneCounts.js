const fs = require('fs').promises;
const path = require('path');
const { initializePool } = require('../config/database');

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
    const connection = await dbPool.connect();
    try {
      await connection.query('BEGIN');

      // Insert gene symbols with an initial count of 0
      const insertQuery = `
        INSERT INTO gene_variant_counts (gene_symbol, variant_count)
        VALUES ($1, 0)
        ON CONFLICT (gene_symbol) DO NOTHING`;

      for (const geneSymbol of geneSymbols) {
        await connection.query(insertQuery, [geneSymbol]);
      }

      await connection.query('COMMIT');
      console.log('Successfully populated gene counts table');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error populating gene counts table:', error);
    throw error;
  }
}

module.exports = { populateGeneCounts };