// utils/connectionManager.js

const { Pool } = require('pg');
const retry = require('retry');

class ConnectionManager {
  constructor(config) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500,
    });

    this.setupPoolErrorHandling();
  }

  setupPoolErrorHandling() {
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      console.log('New client connected to PostgreSQL');
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from pool');
    });
  }

  async executeWithRetry(operation) {
    const operation = retry.operation({
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 5000
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const client = await this.pool.connect();
          try {
            const result = await operation(client);
            resolve(result);
          } finally {
            client.release();
          }
        } catch (err) {
          if (operation.retry(err)) {
            return;
          }
          reject(err);
        }
      });
    });
  }

  async healthCheck() {
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Database health check failed:', err);
      return false;
    }
  }

  async end() {
    await this.pool.end();
  }
}

module.exports = new ConnectionManager();