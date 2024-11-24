const { pool } = require('../config/database');

// Retrieves user preferences for variation id and full name.
exports.getUserPreferences = async (req, res, next) => {
  const client = await pool.connect();
  try {
    console.log('Fetching preferences for user:', req.userId);

    const { rows } = await client.query(
      'SELECT full_name_preferences, variation_id_preferences FROM user_preferences WHERE user_id = $1',
      [req.userId]
    );
    
    // Set the preferences if they exist
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
  } finally {
    client.release();
  }
};

// Set the user preferences.
exports.updateUserPreferences = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { fullNamePreferences, variationIDPreferences } = req.body;
    
    const fullNamePrefsJSON = JSON.stringify(fullNamePreferences);
    const variationIDPrefsJSON = JSON.stringify(variationIDPreferences);

    await client.query(
      `INSERT INTO user_preferences (user_id, full_name_preferences, variation_id_preferences) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         full_name_preferences = $2,
         variation_id_preferences = $3`,
      [
        req.userId, 
        fullNamePrefsJSON,
        variationIDPrefsJSON
      ]
    );
    
    console.log('Preferences updated for user:', req.userId);
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    next(error);
  } finally {
    client.release();
  }
};