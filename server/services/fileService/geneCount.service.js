// services/geneCount.service.js

const axios = require('axios');
const { Pool } = require('pg');

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

async function updateGeneCounts(pool, logger = console) {
  const client = await pool.connect();
  try {
    const { rows: genes } = await client.query(
      'SELECT gene_symbol FROM gene_variant_counts'
    );
    
    for (const gene of genes) {
      let count = await executeSearch(gene.gene_symbol, true);
      
      if (count === 0) {
        console.log(`Zero results found with [gene] tag for ${gene.gene_symbol}, retrying without tag...`);
        count = await executeSearch(gene.gene_symbol, false);
      }

      await client.query(
        `UPDATE gene_variant_counts 
         SET variant_count = $1, last_updated = NOW() 
         WHERE gene_symbol = $2`,
        [count, gene.gene_symbol]
      );

      logger.log(`Updated count for ${gene.gene_symbol}: ${count} variants`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.log('Gene count update completed successfully');
  } catch (error) {
    logger.log('Error updating gene counts:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function getSingleGeneCount(geneSymbol) {
  let count = await executeSearch(geneSymbol, true);
  
  if (count === 0) {
    console.log(`Zero results found with [gene] tag for ${geneSymbol}, retrying without tag...`);
    count = await executeSearch(geneSymbol, false);
  }

  return count;
}

module.exports = {
  updateGeneCounts,
  getSingleGeneCount
};