const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  console.log('Auth middleware called');
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
      req.userId = decoded.userId;
      next();
    } catch (error) {
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