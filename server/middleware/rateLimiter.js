// middleware/rateLimiter.js

const { Pool } = require('pg');
const { pool } = require('../config/database');

class PostgresRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.max = options.max || 100; // limit each IP to 100 requests per windowMs
    this.message = options.message || 'Too many requests from this IP, please try again later.';
    this.statusCode = options.statusCode || 429;
  }

  async init() {
    const client = await pool.connect();
    try {
      // Create rate limiting table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          requests INTEGER DEFAULT 1,
          expires_at TIMESTAMP WITH TIME ZONE,
          first_request_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on expires_at for cleanup
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_rate_limits_expires 
        ON rate_limits(expires_at)
      `);

      // Setup cleanup job
      setInterval(async () => {
        try {
          await pool.query('DELETE FROM rate_limits WHERE expires_at < NOW()');
        } catch (error) {
          console.error('Rate limit cleanup error:', error);
        }
      }, 60000); // Run every minute

    } finally {
      client.release();
    }
  }

  middleware() {
    return async (req, res, next) => {
      const key = req.ip;
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Get current limits
        const { rows } = await client.query(
          'SELECT * FROM rate_limits WHERE key = $1',
          [key]
        );

        const now = new Date();
        const windowStart = new Date(now.getTime() - this.windowMs);

        if (rows.length === 0) {
          // First request from this IP
          await client.query(
            `INSERT INTO rate_limits (key, requests, expires_at)
             VALUES ($1, 1, $2)`,
            [key, new Date(now.getTime() + this.windowMs)]
          );
          await client.query('COMMIT');
          return next();
        }

        const current = rows[0];
        
        // Check if window has expired
        if (current.expires_at < now) {
          // Reset window
          await client.query(
            `UPDATE rate_limits 
             SET requests = 1,
                 expires_at = $1,
                 first_request_at = CURRENT_TIMESTAMP
             WHERE key = $2`,
            [new Date(now.getTime() + this.windowMs), key]
          );
          await client.query('COMMIT');
          return next();
        }

        // Check if limit exceeded
        if (current.requests >= this.max) {
          await client.query('COMMIT');
          return res.status(this.statusCode).json({
            error: this.message,
            retryAfter: Math.ceil((current.expires_at - now) / 1000)
          });
        }

        // Increment request count
        await client.query(
          'UPDATE rate_limits SET requests = requests + 1 WHERE key = $1',
          [key]
        );

        await client.query('COMMIT');
        next();

      } catch (error) {
        await client.query('ROLLBACK');
        next(error);
      } finally {
        client.release();
      }
    };
  }
}

// Create rate limiter instance
const limiter = new PostgresRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
  // Dynamic rate limiting for specific endpoints
  endpointLimits: {
    '/api/clinvar': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50
    },
    '/api/download': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20
    }
  }
});


// Initialize rate limiter on application start
limiter.init().catch(error => {
  console.error('Failed to initialize rate limiter:', error);
  process.exit(1);
});

/**
 * Custom rate limiter middleware factory
 */
const createRateLimiter = (options = {}) => {
  const customLimiter = new PostgresRateLimiter(options);
  customLimiter.init().catch(console.error);
  return customLimiter.middleware();
};

module.exports = {
  defaultLimiter: limiter.middleware(),
  createRateLimiter
};