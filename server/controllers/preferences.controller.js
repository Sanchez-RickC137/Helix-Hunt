const { pool } = require('../config/database');

exports.getUserPreferences = async (req, res, next) => {
  try {
    console.log('Fetching preferences for user:', req.userId);

    const [rows] = await pool.execute(
      'SELECT full_name_preferences, variation_id_preferences FROM user_preferences WHERE user_id = ?',
      [req.userId]
    );
    
    if (rows.length > 0) {
      const result = {
        fullNamePreferences: Array.isArray(rows[0].full_name_preferences) 
          ? rows[0].full_name_preferences 
          : JSON.parse(rows[0].full_name_preferences || '[]'),
        variationIDPreferences: Array.isArray(rows[0].variation_id_preferences)
          ? rows[0].variation_id_preferences
          : JSON.parse(rows[0].variation_id_preferences || '[]')
      };
      console.log('Sending preferences:', result);
      res.json(result);
    } else {
      console.log('No preferences found for user:', req.userId);
      res.json({ fullNamePreferences: [], variationIDPreferences: [] });
    }
  } catch (error) {
    console.error('Error in user preferences route:', error);
    next(error);
  }
};

exports.updateUserPreferences = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { fullNamePreferences, variationIDPreferences } = req.body;
    
    const fullNamePrefsJSON = JSON.stringify(fullNamePreferences);
    const variationIDPrefsJSON = JSON.stringify(variationIDPreferences);

    await pool.execute(
      `INSERT INTO user_preferences (user_id, full_name_preferences, variation_id_preferences) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE full_name_preferences = ?, variation_id_preferences = ?`,
      [
        req.userId, 
        fullNamePrefsJSON,
        variationIDPrefsJSON,
        fullNamePrefsJSON,
        variationIDPrefsJSON
      ]
    );
    
    console.log('Preferences updated for user:', req.userId);
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    next(error);
  }
};