const pool = require('../config/database');

class QueryHistory {
  static async create(userId, query) {
    const [result] = await pool.execute(
      'INSERT INTO query_history (user_id, query, timestamp) VALUES (?, ?, NOW())',
      [userId, JSON.stringify(query)]
    );
    return result.insertId;
  }

  static async getByUserId(userId, limit = 5) {
    const [rows] = await pool.execute(
      'SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );
    return rows.map(row => ({...row, query: JSON.parse(row.query)}));
  }

  static async deleteByUserId(userId) {
    await pool.execute(
      'DELETE FROM query_history WHERE user_id = ?',
      [userId]
    );
  }
}

module.exports = QueryHistory;