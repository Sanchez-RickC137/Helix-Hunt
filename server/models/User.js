const pool = require('../config/database');

class User {
  static async create(username, hashedPassword) {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    return result.insertId;
  }

  static async findByUsername(username) {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users[0];
  }

  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );
    return users[0];
  }

  static async updatePassword(id, hashedPassword) {
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
  }


static async updateFullNamePreferences(id, preferences) {
    await pool.execute(
      'UPDATE user_preferences SET full_name_preferences = ? WHERE user_id = ?',
      [JSON.stringify(preferences), id]
    );
  }

  static async updateVariationIDPreferences(id, preferences) {
    await pool.execute(
      'UPDATE user_preferences SET variation_id_preferences = ? WHERE user_id = ?',
      [JSON.stringify(preferences), id]
    );
  }

  static async getPreferences(id) {
    const [rows] = await pool.execute(
      'SELECT full_name_preferences, variation_id_preferences FROM user_preferences WHERE user_id = ?',
      [id]
    );
    if (rows.length > 0) {
      return {
        fullNamePreferences: JSON.parse(rows[0].full_name_preferences || '[]'),
        variationIDPreferences: JSON.parse(rows[0].variation_id_preferences || '[]')
      };
    }
    return { fullNamePreferences: [], variationIDPreferences: [] };
  }
}
module.exports = User;