/**
 * Script to generate the TranscriptID_GeneSymbol, DNA_Change, and
 * Protein_Change files for bouncing user input off of for suggestions.
 */
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function generateDataFiles() {
  const pool = new Pool({
    connectionString: process.env.EXTERNAL_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await pool.query('SELECT NOW()'); // Test connection
    console.log('Connected successfully');

    const dataDir = path.join(__dirname, '../data');
    await fs.mkdir(dataDir, { recursive: true });

    const { rows: transcriptGeneRows } = await pool.query(`
      SELECT DISTINCT CONCAT(transcript_id, '(', gene_symbol, ')') as combined
      FROM component_parts 
      WHERE transcript_id IS NOT NULL 
      AND gene_symbol IS NOT NULL
      ORDER BY combined
    `);
    await fs.writeFile(
      path.join(dataDir, 'TranscriptID_GeneSym.txt'),
      transcriptGeneRows.map(row => row.combined).join('\n')
    );
    console.log(`Generated TranscriptID_GeneSym.txt with ${transcriptGeneRows.length} entries`);

    const { rows: dnaRows } = await pool.query(`
      SELECT DISTINCT dna_change 
      FROM component_parts 
      WHERE dna_change IS NOT NULL
      ORDER BY dna_change
    `);
    await fs.writeFile(
      path.join(dataDir, 'DNA_Change.txt'),
      dnaRows.map(row => row.dna_change).join('\n')
    );
    console.log(`Generated DNA_Change.txt with ${dnaRows.length} entries`);

    const { rows: proteinRows } = await pool.query(`
      SELECT DISTINCT protein_change 
      FROM component_parts 
      WHERE protein_change IS NOT NULL
      ORDER BY protein_change
    `);
    await fs.writeFile(
      path.join(dataDir, 'Protein_Change.txt'),
      proteinRows.map(row => row.protein_change).join('\n')
    );
    console.log(`Generated Protein_Change.txt with ${proteinRows.length} entries`);

  } catch (error) {
    console.error('Error generating data files:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  generateDataFiles()
    .then(() => {
      console.log('Data files generated successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateDataFiles };