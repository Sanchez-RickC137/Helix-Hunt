const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  register,
  login,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  checkEmail
} = require('../controllers/auth.controller');

const router = express.Router();

// User registration
router.post('/register', register);

// User login
router.post('/login', login);

// Change password
router.post('/change-password', changePassword);

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/check-email', checkEmail);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;