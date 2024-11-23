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
router.post('/register', [
  body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
], register);

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