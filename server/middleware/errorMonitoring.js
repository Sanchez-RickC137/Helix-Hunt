const { Pool } = require('pg');
const { pool } = require('../config/database');

const errorMonitoring = async (req, res, next) => {
  const start = process.hrtime();
  
  // Track memory usage
  const memoryUsage = process.memoryUsage();
  const memoryThreshold = 1024 * 1024 * 1024; // 1GB

  if (memoryUsage.heapUsed > memoryThreshold) {
    console.warn('High memory usage detected:', {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString()
    });
    
    // Check database connection pool status
    try {
      const client = await pool.connect();
      const { rows: [poolStats] } = await client.query(`
        SELECT count(*) as total_connections,
               count(*) FILTER (WHERE state = 'active') as active_connections,
               count(*) FILTER (WHERE state = 'idle') as idle_connections,
               count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `);
      
      console.warn('Database pool stats:', poolStats);
      client.release();
    } catch (error) {
      console.error('Error checking pool stats:', error);
    }
  }

  // Monitor slow queries
  const longQueryThreshold = 5000; // 5 seconds
  const queryTimeout = setTimeout(async () => {
    try {
      const client = await pool.connect();
      const { rows } = await client.query(`
        SELECT pid, usename, query_start, state, query
        FROM pg_stat_activity
        WHERE state != 'idle'
        AND (now() - query_start) > interval '5 seconds'
        AND datname = current_database();
      `);
      
      if (rows.length > 0) {
        console.warn('Long running queries detected:', rows);
      }
      client.release();
    } catch (error) {
      console.error('Error checking long queries:', error);
    }
  }, longQueryThreshold);

  // Track response time
  res.on('finish', async () => {
    clearTimeout(queryTimeout);
    const duration = process.hrtime(start);
    const responseTime = (duration[0] * 1e3 + duration[1] * 1e-6).toFixed(2);

    if (responseTime > 5000) {
      console.warn('Slow response detected:', {
        method: req.method,
        url: req.url,
        duration: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });

      // Log slow query to database
      try {
        const client = await pool.connect();
        await client.query(`
          INSERT INTO performance_logs (
            endpoint,
            method,
            duration,
            timestamp,
            memory_usage
          ) VALUES ($1, $2, $3, NOW(), $4)`,
          [
            req.url,
            req.method,
            parseFloat(responseTime),
            JSON.stringify({
              heapUsed: memoryUsage.heapUsed,
              heapTotal: memoryUsage.heapTotal
            })
          ]
        );
        client.release();
      } catch (error) {
        console.error('Error logging performance data:', error);
      }
    }
  });

  next();
};

module.exports = errorMonitoring;