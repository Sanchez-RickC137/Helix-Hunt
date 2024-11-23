/**
 * Query history model class
 * Manages the storage and retrieval of user query history
 */

const pool = require('../config/database');

class QueryHistory {
  static async create(userId, query) {
    const { rows: [result] } = await pool.query(
      `INSERT INTO query_history 
       (user_id, query, timestamp) 
       VALUES ($1, $2, NOW()) 
       RETURNING id`,
      [userId, JSON.stringify(query)]
    );
    return result.id;
  }

  static async getByUserId(userId, limit = 5) {
    const { rows } = await pool.query(
      `SELECT * FROM query_history 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return rows.map(row => ({
      ...row,
      query: JSON.parse(row.query)
    }));
  }

  static async deleteByUserId(userId) {
    await pool.query(
      'DELETE FROM query_history WHERE user_id = $1',
      [userId]
    );
  }

  // New method for cleanup of old records
  static async cleanupOldRecords(daysToKeep = 30) {
    await pool.query(
      `DELETE FROM query_history 
       WHERE timestamp < NOW() - INTERVAL '1 day' * $1`,
      [daysToKeep]
    );
  }
}

module.exports = QueryHistory;