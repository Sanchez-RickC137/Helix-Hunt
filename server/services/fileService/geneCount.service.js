const axios = require('axios');
const { pool } = require('../../config/database');

async function updateGeneCounts() {
  try {
    // Get all gene symbols from our table
    const [genes] = await pool.query('SELECT gene_symbol FROM gene_variant_counts');
    
    for (const gene of genes) {
      const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${gene.gene_symbol}[gene]&retmax=25000`;
      const response = await axios.get(esearchUrl);
      
      // Parse XML response to get count
      const countMatch = response.data.match(/<Count>(\d+)<\/Count>/);
      if (countMatch) {
        const count = parseInt(countMatch[1]);
        
        // Update count in database
        await pool.query(
          'UPDATE gene_variant_counts SET variant_count = ?, last_updated = NOW() WHERE gene_symbol = ?',
          [count, gene.gene_symbol]
        );
      }
      
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('Error updating gene counts:', error);
  }
}

module.exports = { updateGeneCounts };