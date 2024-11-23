const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendResetEmail } = require('../services/email.service');


// Register a user
exports.register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check for existing username/email
    const { rows: existing } = await client.query(
      'SELECT username, email FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: `${existing[0].username === username ? 'Username' : 'Email'} already exists` 
      });
    }

    // Insert new user
    const { rows: [user] } = await client.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    // Create default preferences
    await client.query(
      'INSERT INTO user_preferences (user_id, full_name_preferences, variation_id_preferences) VALUES ($1, $2, $3)',
      [user.id, '[]', '[]']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// User Login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Get user with case-sensitive username match
    const { rows: users } = await pool.query(
      'SELECT * FROM users WHERE username = $1',
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
    
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username 
      } 
    });
  } catch (error) {
    next(error);
  }
};

// Change user password
exports.changePassword = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { username, currentPassword, newPassword } = req.body;

    // Get user with password
    const { rows: users } = await client.query(
      'SELECT id, password FROM users WHERE username = $1',
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

    await client.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedNewPassword, user.id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Password change error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  } finally {
    client.release();
  }
};

// Part of the password reset flow. Check email to see if exists and create temporary code
exports.checkEmail = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;

    const { rows: users } = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        exists: false, 
        message: 'No account found with this email.' 
      });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    await client.query('BEGIN');

    // Clear any existing unused codes
    await client.query(
      `DELETE FROM password_reset_codes 
       WHERE email = $1 AND used = false`,
      [email]
    );

    // Insert new code
    await client.query(
      `INSERT INTO password_reset_codes 
       (email, code, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [email, resetCode]
    );

    await client.query('COMMIT');
    await sendResetEmail(email, resetCode);
    
    res.json({ exists: true, message: 'Reset code sent successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Check email error:', error);
    res.status(500).json({ exists: false, error: 'Failed to process request' });
  } finally {
    client.release();
  }
};

// Verify the temporary code given by the user. Part of the password reset flow.
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const { rows: codes } = await pool.query(
      `SELECT * FROM password_reset_codes 
       WHERE email = $1 
       AND code = $2 
       AND expires_at > NOW() 
       AND used = false 
       ORDER BY created_at DESC 
       LIMIT 1`,
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

// Check the email and temporary code for password reset flow
exports.resetPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, code, newPassword } = req.body;
    
    await client.query('BEGIN');

    const { rows: codes } = await client.query(
      `SELECT id FROM password_reset_codes 
       WHERE email = $1 
       AND code = $2 
       AND expires_at > NOW() 
       AND used = false 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [email, code]
    );

    if (codes.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await client.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    await client.query(
      'UPDATE password_reset_codes SET used = true WHERE id = $1',
      [codes[0].id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  } finally {
    client.release();
  }
};

// Starts the password reset flow
exports.forgotPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { email } = req.body;
    
    const { rows: users } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO password_reset_codes 
       (email, code, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [email, resetCode]
    );

    await client.query('COMMIT');
    await sendResetEmail(email, resetCode);

    res.json({ message: 'Reset code sent successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  } finally {
    client.release();
  }
};