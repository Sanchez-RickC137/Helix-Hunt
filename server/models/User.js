/**
 * User model class
 * Handles database operations for user management
 * Includes methods for CRUD operations and preference management
 */

const pool = require('../config/database');

class User {
  /**
   * Creates a new user in the database
   * @param {string} username - User's username
   * @param {string} hashedPassword - Bcrypt hashed password
   * @returns {Promise<number>} Newly created user ID
   */
  static async create(username, hashedPassword) {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );
    return result.insertId;
  }

  /**
   * Finds a user by username
   * @param {string} username - Username to search for
   * @returns {Promise<Object|null>} User object if found, null otherwise
   */
  static async findByUsername(username) {
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return users[0];
  }

  /**
   * Finds a user by ID
   * @param {number} id - User ID to search for
   * @returns {Promise<Object|null>} User object if found, null otherwise
   */
  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id, username FROM users WHERE id = ?',
      [id]
    );
    return users[0];
  }

  /**
   * Updates user's password
   * @param {number} id - User ID
   * @param {string} hashedPassword - New hashed password
   * @returns {Promise<void>}
   */
  static async updatePassword(id, hashedPassword) {
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
  }

  /**
   * Updates user's full name preferences
   * @param {number} id - User ID
   * @param {Array} preferences - Array of full name preferences
   * @returns {Promise<void>}
   */
  static async updateFullNamePreferences(id, preferences) {
    await pool.execute(
      'UPDATE user_preferences SET full_name_preferences = ? WHERE user_id = ?',
      [JSON.stringify(preferences), id]
    );
  }

  /**
   * Updates user's variation ID preferences
   * @param {number} id - User ID
   * @param {Array} preferences - Array of variation ID preferences
   * @returns {Promise<void>}
   */
  static async updateVariationIDPreferences(id, preferences) {
    await pool.execute(
      'UPDATE user_preferences SET variation_id_preferences = ? WHERE user_id = ?',
      [JSON.stringify(preferences), id]
    );
  }

  /**
   * Retrieves user's preferences
   * @param {number} id - User ID
   * @returns {Promise<Object>} Object containing user preferences
   */
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