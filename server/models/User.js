/**
 * User model class
 * Handles database operations for user management
 * Includes methods for CRUD operations and preference management
 */

const pool = require('../config/database');

class User {
  static async create(username, hashedPassword) {
    const { rows: [user] } = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    return user.id;
  }

  static async findByUsername(username) {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, username FROM users WHERE id = $1',
      [id]
    );
    return rows[0];
  }

  static async updatePassword(id, hashedPassword) {
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, id]
    );
  }

  static async updateFullNamePreferences(id, preferences) {
    await pool.query(
      'UPDATE user_preferences SET full_name_preferences = $1 WHERE user_id = $2',
      [JSON.stringify(preferences), id]
    );
  }

  static async updateVariationIDPreferences(id, preferences) {
    await pool.query(
      'UPDATE user_preferences SET variation_id_preferences = $1 WHERE user_id = $2',
      [JSON.stringify(preferences), id]
    );
  }

  static async getPreferences(id) {
    const { rows } = await pool.query(
      'SELECT full_name_preferences, variation_id_preferences FROM user_preferences WHERE user_id = $1',
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