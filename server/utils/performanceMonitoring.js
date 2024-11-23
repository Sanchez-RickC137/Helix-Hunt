const { pool } = require('../config/database');

class PerformanceMonitor {
  static async checkDatabaseHealth() {
    const client = await pool.connect();
    try {
      // Check active connections
      const { rows: [connections] } = await client.query(`
        SELECT count(*) as total,
               count(*) FILTER (WHERE state = 'active') as active,
               count(*) FILTER (WHERE state = 'idle') as idle,
               count(*) FILTER (WHERE waiting) as waiting
        FROM pg_stat_activity
        WHERE datname = current_database();
      `);

      // Check table sizes
      const { rows: tableSizes } = await client.query(`
        SELECT schemaname, relname, n_live_tup, n_dead_tup,
               pg_size_pretty(pg_total_relation_size(relid)) as total_size
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC;
      `);

      // Check index usage
      const { rows: indexUsage } = await client.query(`
        SELECT schemaname, relname, indexrelname,
               idx_scan, idx_tup_read, idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE 'pg_toast%';
      `);

      // Check query statistics
      const { rows: queryStats } = await client.query(`
        SELECT query, calls, total_time, min_time, max_time,
               mean_time, rows
        FROM pg_stat_statements
        ORDER BY total_time DESC
        LIMIT 10;
      `);

      return {
        connections,
        tableSizes,
        unusedIndexes: indexUsage,
        slowQueries: queryStats
      };
    } finally {
      client.release();
    }
  }

  static async logQueryPerformance(queryId, executionTime, result) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO query_performance_logs (
          query_id,
          execution_time,
          rows_returned,
          timestamp
        ) VALUES ($1, $2, $3, NOW())`,
        [queryId, executionTime, result?.rows?.length || 0]
      );
    } finally {
      client.release();
    }
  }

  static async analyzeTableStatistics() {
    const client = await pool.connect();
    try {
      await client.query('ANALYZE VERBOSE');
      const { rows: tableStats } = await client.query(`
        SELECT schemaname, relname,
               n_live_tup, n_dead_tup,
               last_vacuum, last_autovacuum,
               last_analyze, last_autoanalyze
        FROM pg_stat_user_tables;
      `);
      return tableStats;
    } finally {
      client.release();
    }
  }
}

module.exports = PerformanceMonitor;