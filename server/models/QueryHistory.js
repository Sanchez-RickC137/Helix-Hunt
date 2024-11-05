/**
 * Query history model class
 * Manages the storage and retrieval of user query history
 */

const pool = require('../config/database');

class QueryHistory {
  /**
   * Creates a new query history entry
   * @param {number} userId - User ID
   * @param {Object} query - Query details
   * @returns {Promise<number>} New query history entry ID
   */
  static async create(userId, query) {
    const [result] = await pool.execute(
      'INSERT INTO query_history (user_id, query, timestamp) VALUES (?, ?, NOW())',
      [userId, JSON.stringify(query)]
    );
    return result.insertId;
  }

  /**
   * Retrieves query history for a user
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of entries to return
   * @returns {Promise<Array>} Array of query history entries
   */
  static async getByUserId(userId, limit = 5) {
    const [rows] = await pool.execute(
      'SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(row => ({...row, query: JSON.parse(row.query)}));
  }

  /**
   * Deletes all query history for a user
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  static async deleteByUserId(userId) {
    await pool.execute(
      'DELETE FROM query_history WHERE user_id = ?',
      [userId]
    );
  }
}

module.exports = QueryHistory;