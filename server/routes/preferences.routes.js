const express = require('express');
const auth = require('../middleware/auth');
const { 
  getUserPreferences,
  updateUserPreferences 
} = require('../controllers/preferences.controller');

const router = express.Router();

// User preferences flow
router.get('/user-preferences', auth, getUserPreferences);
router.put('/user-preferences', auth, updateUserPreferences);

module.exports = router;