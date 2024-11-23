// utils/sessionManagement.js

const { pool } = require('../config/database');
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.createSessionTable();
  }

  async createSessionTable() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          session_id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP WITH TIME ZONE,
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
      `);
    } finally {
      client.release();
    }
  }

  async createSession(userId, data = {}, expiresIn = '24 hours') {
    const client = await pool.connect();
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      
      await client.query(`
        INSERT INTO user_sessions (
          session_id, 
          user_id, 
          data, 
          expires_at
        ) VALUES ($1, $2, $3, NOW() + $4::INTERVAL)
      `, [sessionId, userId, data, expiresIn]);

      return sessionId;
    } finally {
      client.release();
    }
  }

  async getSession(sessionId) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT * FROM user_sessions 
        WHERE session_id = $1 
        AND expires_at > NOW()
      `, [sessionId]);

      if (rows.length === 0) return null;

      // Update last activity
      await client.query(`
        UPDATE user_sessions 
        SET last_activity = NOW() 
        WHERE session_id = $1
      `, [sessionId]);

      return rows[0];
    } finally {
      client.release();
    }
  }

  async updateSession(sessionId, data) {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE user_sessions 
        SET data = data || $2::jsonb,
            last_activity = NOW()
        WHERE session_id = $1
      `, [sessionId, data]);
    } finally {
      client.release();
    }
  }

  async deleteSession(sessionId) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM user_sessions WHERE session_id = $1', [sessionId]);
    } finally {
      client.release();
    }
  }

  async cleanupExpiredSessions() {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
    } finally {
      client.release();
    }
  }

  async getUserSessions(userId) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT * FROM user_sessions 
        WHERE user_id = $1 
        AND expires_at > NOW() 
        ORDER BY last_activity DESC
      `, [userId]);
      return rows;
    } finally {
      client.release();
    }
  }
}

module.exports = new SessionManager();