const { pool } = require('../config/database');

class IndexManager {
  static async createOptimizedIndexes() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create GiST indexes for text pattern matching
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_gene_symbol_gist 
        ON component_parts USING gist (gene_symbol gist_trgm_ops);
        
        CREATE INDEX IF NOT EXISTS idx_dna_change_gist 
        ON component_parts USING gist (dna_change gist_trgm_ops);
        
        CREATE INDEX IF NOT EXISTS idx_protein_change_gist 
        ON component_parts USING gist (protein_change gist_trgm_ops);
      `);

      // B-tree indexes for exact matches
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_variation_id_btree 
        ON component_parts USING btree (variation_id);
        
        CREATE INDEX IF NOT EXISTS idx_gene_symbol_btree 
        ON component_parts USING btree (gene_symbol);
      `);

      // Create indexes for timestamp-based queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_date_last_evaluated 
        ON submission_summary USING btree (datelastevaluated);
        
        CREATE INDEX IF NOT EXISTS idx_clinical_significance 
        ON submission_summary USING btree (clinicalsignificance);
      `);

      // Create partial indexes for common queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pathogenic_variants 
        ON submission_summary (variationid) 
        WHERE clinicalsignificance = 'Pathogenic';
        
        CREATE INDEX IF NOT EXISTS idx_recent_submissions 
        ON submission_summary (variationid) 
        WHERE datelastevaluated >= NOW() - INTERVAL '6 months';
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reindexTables() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tables = [
        'variant_summary',
        'submission_summary',
        'component_parts',
        'query_history',
        'user_preferences'
      ];

      for (const table of tables) {
        await client.query(`REINDEX TABLE ${table}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async analyzeTableStatistics() {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT schemaname, relname, n_live_tup, n_dead_tup,
               pg_size_pretty(pg_total_relation_size(relid)) as total_size,
               (SELECT COUNT(*) FROM pg_index WHERE indrelid = relid) as index_count
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC;
      `);
      
      return rows;
    } finally {
      client.release();
    }
  }

  static async findUnusedIndexes() {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT schemaname, tablename, indexname, idx_scan, 
               pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE 'pg_toast%';
      `);
      
      return rows;
    } finally {
      client.release();
    }
  }
}

module.exports = IndexManager;