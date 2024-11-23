const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Authentication middleware for protecting API routes
 * Verifies JWT tokens and adds user information to requests
 */
const auth = async (req, res, next) => {
  console.log('Auth middleware called');
  const client = await pool.connect();
  
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      return res.status(401).json({ error: 'No Authorization header provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);

      // Verify user exists in database
      const { rows } = await client.query(
        'SELECT id, username FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (rows.length === 0) {
        throw new Error('User not found');
      }

      // Check if token is blacklisted
      const { rows: blacklistedTokens } = await client.query(
        'SELECT * FROM token_blacklist WHERE token = $1 AND expires_at > NOW()',
        [token]
      );

      if (blacklistedTokens.length > 0) {
        throw new Error('Token is blacklisted');
      }

      // Add user info to request
      req.userId = decoded.userId;
      req.user = rows[0];
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Blacklist expired token
        await client.query(
          `INSERT INTO token_blacklist (token, expires_at) 
           VALUES ($1, NOW() + INTERVAL '1 day')
           ON CONFLICT (token) DO NOTHING`,
          [token]
        );
        
        return res.status(401).json({ error: 'Token expired', isExpired: true });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Please authenticate', details: error.message });
  } finally {
    client.release();
  }
};

module.exports = auth;