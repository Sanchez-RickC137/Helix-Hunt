// utils/cacheService.js

const { pool } = require('../config/database');

class CacheService {
  constructor() {
    this.initializeCache();
  }

  async initializeCache() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS cache_store (
          key TEXT PRIMARY KEY,
          value JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE,
          last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          access_count INTEGER DEFAULT 1
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_store(expires_at);
        CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache_store(last_accessed);
      `);
    } catch (error) {
      console.error('Cache initialization error:', error);
    } finally {
      client.release();
    }
  }

  async set(key, value, ttlMinutes = 60) {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO cache_store (key, value, expires_at)
        VALUES ($1, $2, NOW() + $3 * INTERVAL '1 minute')
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          expires_at = NOW() + $3 * INTERVAL '1 minute',
          last_accessed = NOW(),
          access_count = cache_store.access_count + 1
      `, [key, JSON.stringify(value), ttlMinutes]);
    } finally {
      client.release();
    }
  }

  async get(key) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        UPDATE cache_store 
        SET last_accessed = NOW(),
            access_count = access_count + 1
        WHERE key = $1 
        AND expires_at > NOW()
        RETURNING value
      `, [key]);

      return rows.length > 0 ? rows[0].value : null;
    } finally {
      client.release();
    }
  }

  async delete(key) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM cache_store WHERE key = $1', [key]);
    } finally {
      client.release();
    }
  }

  async clear() {
    const client = await pool.connect();
    try {
      await client.query('TRUNCATE cache_store');
    } finally {
      client.release();
    }
  }

  async cleanup() {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM cache_store WHERE expires_at <= NOW()');
    } finally {
      client.release();
    }
  }

  async getStats() {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
          AVG(access_count) as avg_access_count,
          MAX(access_count) as max_access_count,
          MIN(created_at) as oldest_entry,
          MAX(last_accessed) as last_accessed
        FROM cache_store
      `);
      return rows[0];
    } finally {
      client.release();
    }
  }
}

module.exports = new CacheService();