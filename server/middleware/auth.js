/**
 * Authentication middleware for protecting API routes
 * Verifies JWT tokens and adds user information to requests
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware function to authenticate requests
 * Checks for valid JWT token in Authorization header
 * Adds userId to request object if authentication successful
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @throws {401} If no Authorization header is provided
 * @throws {401} If token is invalid or expired
 */
const auth = (req, res, next) => {
  console.log('Auth middleware called');
  try {
    // Extract Authorization header
    const authHeader = req.header('Authorization');
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      return res.status(401).json({ error: 'No Authorization header provided' });
    }

    // Remove 'Bearer ' prefix and verify token
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracted token:', token);

    try {
      // Verify token and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decoded);
      
      // Add userId to request for use in protected routes
      req.userId = decoded.userId;
      next();
    } catch (error) {
      // Handle token expiration specifically
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', isExpired: true });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Please authenticate', details: error.message });
  }
};

module.exports = auth;