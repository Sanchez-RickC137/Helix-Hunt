const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendResetEmail } = require('../services/email.service');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
   
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
   
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    const [users] = await pool.execute(
      'SELECT id, password FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'An unexpected error occurred while changing the password' });
  }
};

exports.checkEmail = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ exists: false, message: 'No account found with this email.' });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    await pool.execute(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [email, resetCode]
    );

    await sendResetEmail(email, resetCode);
    
    res.json({ exists: true, message: 'Reset code sent successfully' });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ exists: false, error: 'Failed to process request' });
  }
};

exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const [codes] = await pool.execute(
      'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0 ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({ error: 'Failed to verify reset code' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [codes] = await connection.execute(
      'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0 ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (codes.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await connection.execute(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    await connection.execute(
      'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
      [codes[0].id]
    );

    await connection.commit();
    res.json({ message: 'Password has been reset successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password' });
  } finally {
    connection.release();
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    await pool.execute(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [email, resetCode]
    );

    await sendResetEmail(email, resetCode);

    res.json({ message: 'Reset code sent successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};