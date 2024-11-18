const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { performance } = require('perf_hooks');

dotenv.config();

async function runBenchmark() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // Test cases
    const testQueries = [
      { geneSymbol: 'HFE', dnaChange: 'c.845G>A' },
      { proteinChange: 'p.Cys282Tyr' },
      { geneSymbol: 'CFTR', dnaChange: 'c.1521_1523del' },
	  { proteinChange: 'p.Arg150Gln' }
    ];

    console.log('Starting benchmark...\n');

    for (const query of testQueries) {
      console.log(`\nTest case: ${JSON.stringify(query)}`);

      // Original method using LIKE
      console.log('\nTesting original method...');
      const startOld = performance.now();
      
      let whereClause = [];
      let params = [];
      if (query.geneSymbol) {
        whereClause.push('vs.Name LIKE ?');
        params.push(`%${query.geneSymbol}%`);
      }
      if (query.dnaChange) {
        whereClause.push('vs.Name LIKE ?');
        params.push(`%${query.dnaChange}%`);
      }
      if (query.proteinChange) {
        whereClause.push('vs.Name LIKE ?');
        params.push(`%${query.proteinChange}%`);
      }

      const [oldResults] = await pool.query(`
        SELECT DISTINCT vs.*, ss.*
        FROM variant_summary vs
        LEFT JOIN submission_summary ss ON vs.VariationID = ss.VariationID
        WHERE ${whereClause.join(' AND ')}
      `, params);

      const oldTime = performance.now() - startOld;

      // New method using component_parts
      console.log('Testing new method...');
      const startNew = performance.now();

      whereClause = [];
      params = [];
      if (query.geneSymbol) {
        whereClause.push('cp.gene_symbol = ?');
        params.push(query.geneSymbol);
      }
      if (query.dnaChange) {
        whereClause.push('cp.dna_change = ?');
        params.push(query.dnaChange);
      }
      if (query.proteinChange) {
        whereClause.push('cp.protein_change = ?');
        params.push(query.proteinChange);
      }

      const [newResults] = await pool.query(`
        SELECT DISTINCT vs.*, ss.*
        FROM component_parts cp
        JOIN variant_summary vs ON cp.variation_id = vs.VariationID
        LEFT JOIN submission_summary ss ON vs.VariationID = ss.VariationID
        WHERE ${whereClause.join(' AND ')}
      `, params);

      const newTime = performance.now() - startNew;

      // Print results
      console.log('\nResults:');
      console.log(`Original method: ${oldTime.toFixed(2)}ms (${oldResults.length} results)`);
      console.log(`New method: ${newTime.toFixed(2)}ms (${newResults.length} results)`);
      console.log(`Improvement: ${((oldTime - newTime) / oldTime * 100).toFixed(2)}%`);

      // Verify result consistency
      const oldIds = new Set(oldResults.map(r => r.VariationID));
      const newIds = new Set(newResults.map(r => r.VariationID));
      const missingInNew = [...oldIds].filter(x => !newIds.has(x));
      const extraInNew = [...newIds].filter(x => !oldIds.has(x));

      if (missingInNew.length || extraInNew.length) {
        console.log('\nWarning: Result mismatch');
        if (missingInNew.length) console.log(`Missing in new method: ${missingInNew.length} records`);
        if (extraInNew.length) console.log(`Extra in new method: ${extraInNew.length} records`);
      }
    }

  } catch (error) {
    console.error('Benchmark error:', error);
  } finally {
    await pool.end();
  }
}

runBenchmark().catch(console.error);