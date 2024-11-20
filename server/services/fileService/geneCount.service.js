const axios = require('axios');
const { pool } = require('../../config/database');

async function executeSearch(gene, useGeneTag = true) {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  const searchTerm = useGeneTag ? `${gene}[gene]` : gene;
  const url = `${baseUrl}?db=clinvar&term=${searchTerm}&retmax=25000`;
  
  try {
    const response = await axios.get(url);
    const countMatch = response.data.match(/<Count>(\d+)<\/Count>/);
    return countMatch ? parseInt(countMatch[1]) : 0;
  } catch (error) {
    console.error(`Error searching for gene ${gene}:`, error);
    return 0;
  }
}

async function updateGeneCounts() {
  try {
    // Get all gene symbols from our table
    const [genes] = await pool.query('SELECT gene_symbol FROM gene_variant_counts');
    
    for (const gene of genes) {
      // First attempt with [gene] tag
      let count = await executeSearch(gene.gene_symbol, true);
      
      // If count is 0, retry without [gene] tag
      if (count === 0) {
        console.log(`Zero results found with [gene] tag for ${gene.gene_symbol}, retrying without tag...`);
        count = await executeSearch(gene.gene_symbol, false);
      }

      // Update count in database
      await pool.query(
        'UPDATE gene_variant_counts SET variant_count = ?, last_updated = NOW() WHERE gene_symbol = ?',
        [count, gene.gene_symbol]
      );

      console.log(`Updated count for ${gene.gene_symbol}: ${count} variants`);
      
      // Rate limiting pause between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Gene count update completed successfully');
    
  } catch (error) {
    console.error('Error updating gene counts:', error);
    throw error;
  }
}

async function getSingleGeneCount(geneSymbol) {
  try {
    // First attempt with [gene] tag
    let count = await executeSearch(geneSymbol, true);
    
    // If count is 0, retry without [gene] tag
    if (count === 0) {
      console.log(`Zero results found with [gene] tag for ${geneSymbol}, retrying without tag...`);
      count = await executeSearch(geneSymbol, false);
    }

    return count;
  } catch (error) {
    console.error(`Error getting count for gene ${geneSymbol}:`, error);
    throw error;
  }
}

module.exports = { 
  updateGeneCounts,
  getSingleGeneCount
};