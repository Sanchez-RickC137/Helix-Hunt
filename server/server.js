/**
 * Main server application file for HelixHunt
 * Handles all backend routes, database connections, and API endpoints
 * Includes authentication, query processing, and data management
 */

const axios = require('axios');
const bcrypt = require('bcrypt');
const cheerio = require('cheerio');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { createReadStream } = require('fs');
const { Parser } = require('json2csv');
const xml2js = require('xml2js');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('./utils/clinvarUtils');
const { body, validationResult } = require('express-validator');
const auth = require('./middleware/auth');
const validate = require('./middleware/validate');
const { initializeDataService } = require('./services/fileService/scheduler');
const sgMail = require('@sendgrid/mail');

// Load environment variables
dotenv.config();

// Initialize Express application
const app = express();
const port = process.env.PORT || 5001;

// SQL Queries as constants
const BASE_QUERY = `
SELECT DISTINCT
    vs.VariationID,
    vs.Name,
    vs.GeneSymbol,
    vs.Type,
    vs.ClinicalSignificance AS OverallClinicalSignificance,
    vs.LastEvaluated AS OverallLastEvaluated,
    vs.ReviewStatus AS OverallReviewStatus,
    vs.RCVaccession AS AccessionID,
    ss.ClinicalSignificance,
    ss.DateLastEvaluated,
    ss.ReviewStatus,
    ss.CollectionMethod AS Method,
    ss.ReportedPhenotypeInfo AS ConditionInfo,
    ss.Submitter,
    ss.SCV AS SubmitterAccession,
    ss.Description,
    ss.OriginCounts AS AlleleOrigin
FROM variant_summary vs
LEFT JOIN submission_summary ss 
    ON vs.VariationID = ss.VariationID`;

// Middleware setup
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

/**
 * Database Configuration
 * Creates a connection pool for MySQL database access
 * Uses environment variables for secure configuration
 */
// Initialize connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
  namedPlaceholders: true,
  flags: ['LOCAL_FILES'],
  infileStreamFactory: (filepath) => createReadStream(filepath)
});

const saveQuery = async (query) => {
  try {
    const queryData = {
      search_type: query.searchType, // 'targeted' or 'general'
      full_names: query.searchType === 'targeted' ? query.fullNames : null,
      variation_ids: query.searchType === 'targeted' ? query.variationIDs : null,
      search_groups: query.searchType === 'general' ? query.searchGroups : null,
      clinical_significance: query.clinicalSignificance,
      start_date: query.startDate,
      end_date: query.endDate
    };

    await timeOperation('Save query to history', () => 
      axiosInstance.post('/api/save-query', queryData)
    );
    await fetchQueryHistory();
  } catch (error) {
    console.error('Error saving query:', error);
  }
};

// Add this after pool creation
pool.getConnection()
  .then(async connection => {
    try {
      await connection.query('SET GLOBAL local_infile = 1');
      console.log('LOCAL INFILE enabled');
    } finally {
      connection.release();
    }
  })
  .catch(error => {
    console.error('Error configuring pool:', error);
  });

// Then continue with your existing pool connection test
// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');
  connection.release();
});

/**
 * User Registration Route
 * Handles new user registration with input validation
 * Hashes passwords before storage
 * 
 * @route POST /api/register
 * @param {string} username - Minimum 5 characters
 * @param {string} email - Valid email address
 * @param {string} password - Minimum 8 characters
 * @returns {object} Message and userId on success
 */
app.post('/api/register', [
  body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
  body('email').isEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
], async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
   
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
   
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    next(error);
  }
});

/**
 * User Login Route
 * Authenticates users and provides JWT token
 * 
 * @route POST /api/login
 * @param {string} username
 * @param {string} password
 * @returns {object} Token and user data on success
 */
app.post('/api/login', [
  body('username').isLength({ min: 5 }).withMessage('Username must be at least 5 characters long'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  validate
], async (req, res, next) => {
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
    console.error('Login error:', error);
    next(error);
  }
});

/**
 * Password Change Route
 * Changes a user password
 * 
 * @route POST /api/change-password
 * @param {string} username
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {object} Message of password change success or failure
 */
app.post('/api/change-password', [
  body('username').notEmpty().withMessage('Username is required'),
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  validate
], async (req, res, next) => {
  console.log('Received POST request for /api/change-password');
  try {
    const { username, currentPassword, newPassword } = req.body;
    console.log(`Attempting to change password for user: ${username}`);

    // First, retrieve the current user's password
    const [users] = await pool.execute(
      'SELECT id, password FROM users WHERE username = ?',
      [username]
    );
    console.log(`Found ${users.length} users matching the username`);

    if (users.length === 0) {
      console.log('User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log(`Password match result: ${isMatch}`);

    if (!isMatch) {
      console.log('Current password is incorrect');
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // If current password is correct, hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    console.log('New password hashed successfully');

    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, user.id]
    );
    console.log('Password updated in database');

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'An unexpected error occurred while changing the password' });
  }
});

/**
 * Forgot Password Route
 * Email verification for password reset.
 * 
 * @route POST /api/forgot-password
 * @param {string} email
 * @param {string} newPassword
 * @returns {object} Message to proceed with password reset or error
 */
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the email exists
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    // Generate a random 6-digit code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    
    // Store the code with expiration (15 minutes)
    const [result] = await pool.execute(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [email, resetCode]
    );

    // Send email with the code using SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Password Reset Code - HelixHunt',
      text: `Your password reset code is: ${resetCode}\nThis code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Code</h2>
          <p>Your password reset code is: <strong style="font-size: 1.2em; color: #4F46E5;">${resetCode}</strong></p>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #666;">If you did not request this code, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 0.8em; color: #666;">This is an automated message from HelixHunt. Please do not reply to this email.</p>
        </div>
      `
    };

    await sgMail.send(msg);
    res.json({ message: 'Reset code sent successfully' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * Verification route for forgot password
 */
app.post('/api/verify-reset-code', async (req, res) => {
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
});

/**
 * Reset-password route
 */
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verify the code is valid and unused
      const [codes] = await connection.execute(
        'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0 ORDER BY created_at DESC LIMIT 1',
        [email, code]
      );

      if (codes.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update the password
      await connection.execute(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );

      // Mark the reset code as used
      await connection.execute(
        'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
        [codes[0].id]
      );

      await connection.commit();
      res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password' });
  }
});


/**
 * User Preferences GET Route
 * Get the query preferences of a logged in user
 * 
 * @route POST /api/reset-password
 * @param {string} userId
 * @returns {object} fullNamePreferences[] & variationIDPreferences[]
 */
app.get('/api/user-preferences', auth, async (req, res, next) => {
  console.log('User preferences route called');
  try {
    console.log('Fetching preferences for user:', req.userId);

    const [rows] = await pool.execute(
      'SELECT full_name_preferences, variation_id_preferences FROM user_preferences WHERE user_id = ?',
      [req.userId]
    );
    
    console.log('Database query result:', rows);

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
    res.status(500).json({ error: 'An error occurred while fetching preferences', details: error.message });
  }
});

/**
 * User Preferences PUT Route
 * Make changes to the query preferences of a logged in user
 * 
 * @route POST /api/user-preferences
 * @param {string} userId
 * @returns {object} Message for update success or error
 */
app.put('/api/user-preferences', auth, async (req, res, next) => {
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
});


/**
 * Save Query to History Route
 * Save new query to query history if user is logged in
 * 
 * @route POST /api/save-query
 * @param {string} userId
 * @returns {object} Message for query history success or error
 */
// app.post('/api/save-query', auth, async (req, res, next) => {
//   try {
//     console.log('Saving query for user:', req.userId);
//     const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
//     // Convert empty string dates to null
//     const formattedStartDate = startDate || null;
//     const formattedEndDate = endDate || null;

//     await pool.execute(
//       'INSERT INTO query_history (user_id, full_names, variation_ids, clinical_significance, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
//       [req.userId, JSON.stringify(fullNames), JSON.stringify(variationIDs), JSON.stringify(clinicalSignificance), formattedStartDate, formattedEndDate]
//     );
//     console.log('Query saved successfully');
//     res.json({ message: 'Query saved to history successfully' });
//   } catch (error) {
//     console.error('Error saving query to history:', error);
//     res.status(500).json({ error: 'An error occurred while saving the query', details: error.message });
//   }
// });

app.post('/api/save-query', auth, async (req, res, next) => {
  try {
    const {
      search_type,
      full_names,
      variation_ids,
      search_groups,
      clinical_significance,
      start_date,
      end_date
    } = req.body;
    
    // Convert empty strings to null for dates
    const formattedStartDate = start_date && start_date.trim() !== '' ? start_date : null;
    const formattedEndDate = end_date && end_date.trim() !== '' ? end_date : null;
    
    await pool.execute(
      `INSERT INTO query_history 
       (user_id, search_type, full_names, variation_ids, search_groups, 
        clinical_significance, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        search_type || 'targeted',
        JSON.stringify(full_names || []),
        JSON.stringify(variation_ids || []),
        JSON.stringify(search_groups || []),
        JSON.stringify(clinical_significance || []),
        formattedStartDate,
        formattedEndDate
      ]
    );
    
    res.json({ message: 'Query saved to history successfully' });
  } catch (error) {
    console.error('Error saving query to history:', error);
    res.status(500).json({ error: 'An error occurred while saving the query' });
  }
});



/**
 * Query History GET Route
 * Get query history for a user if a user is logged in
 * 
 * @route POST /api/save-query
 * @param {string} userId
 * @returns {object} processedRows {}
 */
// app.get('/api/query-history', auth, async (req, res, next) => {
//   try {
//     const [rows] = await pool.query('SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5', [req.userId]);
    
//     const processedRows = rows.map(row => ({
//       id: row.id,
//       fullNames: row.full_names || [],
//       variationIDs: row.variation_ids || [],
//       clinicalSignificance: row.clinical_significance || [],
//       startDate: row.start_date,
//       endDate: row.end_date,
//       timestamp: row.timestamp
//     }));

//     res.json(processedRows);
//   } catch (error) {
//     console.error('Error fetching query history:', error);
//     res.status(500).json({ error: 'An error occurred while fetching query history' });
//   }
// });

app.get('/api/query-history', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5', 
      [req.userId]
    );
    
    // Return the raw rows - let the frontend handle parsing
    res.json(rows);
  } catch (error) {
    console.error('Error fetching query history:', error);
    res.status(500).json({ error: 'An error occurred while fetching query history' });
  }
});

/**
 * ClinVar Query Route. Main Query Route
 * Query Clinvar database based off of user input.
 * 
 * @route POST /api/clinvar
 * @param {string} fullNames
 * @param {string} variationIDs
 * @param {string} clinicalSignificance
 * @param {string} startDate
 * @param {string} endDate
 * @returns {object} results [], all clinical submissions results found
 */
app.post('/api/clinvar', [
  body('fullNames').optional().isArray(),
  body('variationIDs').optional().isArray(),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], async (req, res, next) => {
  console.log('Received request:', JSON.stringify(req.body, null, 2));
  
  try {
    const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
    if ((!fullNames || fullNames.length === 0) && (!variationIDs || variationIDs.length === 0)) {
      return res.status(400).json({ error: 'Either full name or variant ID is required' });
    }
    const results = [];
    // Process full names
    for (const fullName of fullNames || []) {
      const result = await processClinVarQuery(fullName, null, clinicalSignificance, startDate, endDate);
      results.push(result);
    }
    // Process variation IDs
    for (const variantId of variationIDs || []) {
      const result = await processClinVarQuery(null, variantId, clinicalSignificance, startDate, endDate);
      results.push(result);
    }
    console.log(results);
    res.json(results);
  } catch (error) {
    console.error('Error processing ClinVar queries:', error);
    res.status(500).json({ error: 'An error occurred while processing queries', details: error.message });
  }
});

/**
 * General ClinVar Query Route
 * Handles broader searches with multiple term combinations
 * 
 * @route POST /api/clinvar/general
 * @param {Object[]} searchGroups - Array of search term groups
 * @param {string} searchGroups[].geneSymbol - Gene symbol search term
 * @param {string} searchGroups[].dnaChange - DNA change search term
 * @param {string} searchGroups[].proteinChange - Protein change search term
 * @returns {Object[]} Array of results for each search group
 */
app.post('/api/clinvar/general', [
  body('searchGroups').isArray(),
  body('clinicalSignificance').optional().isArray(),
  body('startDate').optional().isString(),
  body('endDate').optional().isString(),
  validate
], async (req, res, next) => {
  console.log('Received general search request:', JSON.stringify(req.body, null, 2));
  
  try {
    const { searchGroups, clinicalSignificance, startDate, endDate } = req.body;
    
    if (!searchGroups || searchGroups.length === 0) {
      return res.status(400).json({ error: 'At least one search group is required' });
    }

    const results = [];
    
    // Process each search group
    for (const group of searchGroups) {
      const searchTerms = [];
      if (group.geneSymbol) searchTerms.push(group.geneSymbol);
      if (group.dnaChange) searchTerms.push(group.dnaChange);
      if (group.proteinChange) searchTerms.push(group.proteinChange);

      if (searchTerms.length === 0) {
        continue; // Skip empty groups
      }

      // Construct the search URL
      const searchQuery = searchTerms.map(term => `(${encodeURIComponent(term)})`).join(' AND ');
      const groupResults = await processGeneralClinVarQuery(searchQuery, group, clinicalSignificance, startDate, endDate);
      
      // If groupResults is an array, spread it; if it's an error object, add it directly
      if (Array.isArray(groupResults)) {
        results.push(...groupResults);
      } else {
        results.push(groupResults);
      }
    }
    res.json(results);
  } catch (error) {
    console.error('Error processing general ClinVar queries:', error);
    res.status(500).json({ error: 'An error occurred while processing queries', details: error.message });
  }
});

/**
 * Database Query Routes
 */

// Query by Variation ID
app.post('/api/database/variation-id', [
  body('variationId').notEmpty().withMessage('Variation ID is required'),
  validate
], async (req, res) => {
  try {
    console.log('Database variation ID query received:', req.body);
    const query = `${BASE_QUERY}
      WHERE vs.VariationID = ?
      ORDER BY ss.DateLastEvaluated DESC`;
    const [results] = await pool.execute(query, [req.body.variationId]);
    console.log('Raw database results:', results);
    if (results.length === 0) {
      return res.json([{
        error: "Not found",
        details: "No results found for the specified variation ID",
        searchTerm: req.body.variationId
      }]);
    }
   
    const processedResults = processDbResults(results, req.body.variationId);
    console.log('Processed database results:', processedResults);
    res.json(processedResults);
  } catch (error) {
    console.error('Database variation ID query error:', error);
    res.status(500).json([{
      error: 'Database query failed',
      details: error.message,
      searchTerm: req.body.variationId
    }]);
  }
});

// Query by Full Name
app.post('/api/database/full-name', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  validate
], async (req, res) => {
  try {
    console.log('Database full name query received:', req.body);

    const query = `${BASE_QUERY}
      WHERE vs.Name = ?
      ORDER BY ss.DateLastEvaluated DESC`;

    const [results] = await pool.execute(query, [req.body.fullName]);

    if (results.length === 0) {
      return res.json([{
        error: "Not found",
        details: "No results found for the specified full name",
        searchTerm: req.body.fullName
      }]);
    }

    const processedResults = processDbResults(results, req.body.fullName);
    console.log('Processed database results:', processedResults);
    res.json(processedResults);
  } catch (error) {
    console.error('Database full name query error:', error);
    res.status(500).json([{ 
      error: 'Database query failed', 
      details: error.message,
      searchTerm: req.body.fullName
    }]);
  }
});

// // General Search Query
// app.post('/api/database/general-search', [
//   body(['geneSymbol', 'dnaChange', 'proteinChange'])
//     .optional()
//     .isString()
//     .trim(),
//   validate
// ], async (req, res) => {
//   try {
//     console.log('Database general search query received:', req.body);
    
//     const conditions = [];
//     const params = [];
//     const searchTerms = [];
    
//     if (req.body.geneSymbol) {
//       conditions.push('vs.GeneSymbol LIKE ?');
//       params.push(`%${req.body.geneSymbol}%`);
//       searchTerms.push(req.body.geneSymbol);
//     }
//     if (req.body.dnaChange) {
//       conditions.push('vs.Name LIKE ?');
//       params.push(`%${req.body.dnaChange}%`);
//       searchTerms.push(req.body.dnaChange);
//     }
//     if (req.body.proteinChange) {
//       conditions.push('vs.Name LIKE ?');
//       params.push(`%${req.body.proteinChange}%`);
//       searchTerms.push(req.body.proteinChange);
//     }

//     if (conditions.length === 0) {
//       return res.json([{
//         error: "Invalid request",
//         details: "At least one search criterion is required",
//         searchTerm: "General search"
//       }]);
//     }

//     const query = `${BASE_QUERY}
//       WHERE ${conditions.join(' AND ')}
//       ORDER BY ss.DateLastEvaluated DESC
//       LIMIT 100`;

//     const [results] = await pool.execute(query, params);

//     if (results.length === 0) {
//       return res.json([{
//         error: "Not found",
//         details: "No results found matching the search criteria",
//         searchTerm: searchTerms.join(' ')
//       }]);
//     }

//     const processedResults = processDbResults(results, searchTerms.join(' '));
//     console.log('Processed database results:', processedResults);
//     res.json(processedResults);
//   } catch (error) {
//     console.error('Database general search error:', error);
//     res.status(500).json([{ 
//       error: 'Database query failed', 
//       details: error.message,
//       searchTerm: "General search"
//     }]);
//   }
// });

// General Search Query
app.post('/api/database/general-search', [
  body('searchGroups').isArray(),
  validate
], async (req, res) => {
  try {
    console.log('Database general search query received:', req.body);
    
    if (!req.body.searchGroups || req.body.searchGroups.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        details: "At least one search group is required"
      });
    }

    // Process each search group
    const results = [];
    for (const group of req.body.searchGroups) {
      const conditions = [];
      const params = [];
      
      if (group.geneSymbol) {
        conditions.push('vs.GeneSymbol LIKE ?');
        params.push(`%${group.geneSymbol}%`);
      }
      if (group.dnaChange) {
        conditions.push('vs.Name LIKE ?');
        params.push(`%${group.dnaChange}%`);
      }
      if (group.proteinChange) {
        conditions.push('vs.Name LIKE ?');
        params.push(`%${group.proteinChange}%`);
      }

      if (conditions.length > 0) {
        const query = `${BASE_QUERY}
          WHERE ${conditions.join(' AND ')}
          ORDER BY ss.DateLastEvaluated DESC`;

        console.log('Executing query:', query);
        console.log('With parameters:', params);

        const [groupResults] = await pool.execute(query, params);
        results.push(...groupResults);
      }
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "Not found",
        details: "No results found matching the search criteria"
      });
    }

    // Process results to match the expected format
    const processedResults = processDbResults(results, 'General Search');
    console.log(`Found ${results.length} results for general search`);
    res.json(processedResults);

  } catch (error) {
    console.error('Database general search error:', error);
    res.status(500).json({
      error: 'Database query failed',
      details: error.message
    });
  }
});

// Helper function to process database results (if not already defined)
function processDbResults(results, searchTerm) {
  if (!results || results.length === 0) {
    return [{
      error: "No results found",
      details: "No matching data in database",
      searchTerm
    }];
  }

  // Group results by VariationID
  const groupedResults = results.reduce((acc, result) => {
    const variationId = result.VariationID;
    if (!acc[variationId]) {
      acc[variationId] = [];
    }
    acc[variationId].push(result);
    return acc;
  }, {});

  // Transform groups into standard format
  return Object.entries(groupedResults).map(([variationId, submissions]) => {
    const mainResult = submissions[0];
    
    return {
      searchTerm,
      variantDetails: {
        fullName: mainResult.Name || '',
        geneSymbol: mainResult.GeneSymbol || '',
        transcriptID: '',
        dnaChange: '',
        proteinChange: '',
        variationID: mainResult.VariationID?.toString() || '',
        accessionID: mainResult.RCVaccession || ''
      },
      assertionList: submissions.map(submission => ({
        Classification: {
          value: submission.ClinicalSignificance || '',
          date: submission.DateLastEvaluated || ''
        },
        'Review status': {
          stars: '',
          'assertion criteria': submission.ReviewStatus || '',
          method: submission.Method || ''
        },
        Condition: {
          name: submission.ConditionInfo?.split(':')[1]?.trim() || '',
          'Affected status': '',
          'Allele origin': submission.AlleleOrigin || ''
        },
        Submitter: {
          name: submission.Submitter || '',
          Accession: submission.SubmitterAccession || '',
          'First in ClinVar': '',
          'Last updated': submission.DateLastEvaluated || ''
        },
        'More information': {
          Publications: {},
          'Other databases': {},
          Comment: submission.Description || ''
        }
      }))
    };
  });
}

/**
 * Download route.
 * Takes user requrest for a file type and transforms query
 * results into requested file type
 * 
 * @route POST /api/save-query
 * @param {object} results
 * @param {string} format
 * @returns {object} content BLOB
 */
app.post('/api/download', (req, res) => {
  try {
    const { results, format } = req.body;
    const content = generateDownloadContent(results, format);
    
    let contentType;
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'tsv':
        contentType = 'text/tab-separated-values';
        break;
      case 'xml':
        contentType = 'application/xml';
        break;
      default:
        throw new Error('Unsupported format');
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=clinvar_results.${format}`);
    
    res.send(content);
  } catch (error) {
    console.error('Error generating download:', error);
    res.status(500).json({ error: 'Failed to generate download' });
  }
});

/**
 * Helper function to process ClinVar queries
 * Fetches and parses data from ClinVar website
 * 
 * @param {string} fullName - Gene full name
 * @param {string} variantId - Variation ID
 * @param {string[]} clinicalSignificance - Array of clinical significance values
 * @param {string} startDate - Start date for filtering
 * @param {string} endDate - End date for filtering
 * @returns {object} Processed query results
 */
async function processClinVarQuery(fullName, variantId, clinicalSignificance, startDate, endDate) {
  let url;
  let searchTerm;
  if (variantId) {
    searchTerm = variantId;
    url = `https://www.ncbi.nlm.nih.gov/clinvar/variation/${variantId}/`;
    console.log('Using Variant ID URL:', url);
  } else if (fullName) {
    url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${encodeURIComponent(fullName)}`;
    searchTerm = fullName;
    console.log('Using Full Name URL:', url);
  } else {
    throw new Error('Either full name or variant ID is required');
  }
   
  console.log(`Fetching data from URL: ${url}`);
  try {
    const response = await axios.get(url, { timeout: 10000 }); // 10 second timeout
    console.log('Response received, status:', response.status);
   
    let $ = cheerio.load(response.data);

    // Check for "No items found" in title
    if ($('title').text().includes('No items found')) {
      console.log("No results found for this query.");
      return { error: "No items found", details: "The provided variation ID or name was not found in ClinVar.", searchTerm };
    }

    if ($('title').text().substring(0, 3) !== "VCV") {
      console.log('On search results page, looking for correct link');
      const entries = $('.blocklevelaintable');
      let nextPage = "https://www.ncbi.nlm.nih.gov";
      let i = 0;
      let isFound = false;
      while (i < entries.length && !isFound) {
        const entryText = $(entries[i]).text().trim();
        console.log(`Checking entry ${i}: ${entryText}`);
        if (entryText === searchTerm) {
          nextPage += $(entries[i]).attr('href');
          isFound = true;
          console.log('Found correct link:', nextPage);
        } else {
          i++;
        }
      }
     
      if (!isFound) {
        return { error: "Target variation not found", details: "The specific variation was not found in the search results.", searchTerm };
      }
      console.log('Fetching target page:', nextPage);
      const targetResponse = await axios.get(nextPage, { timeout: 10000 });
      console.log('Target page received, status:', targetResponse.status);
      $ = cheerio.load(targetResponse.data);
    } else {
      console.log('Already on target page');
    }
    const variantDetailsHtml = $('#id_first').html();
    const assertionListTable = $('#assertion-list').prop('outerHTML');
    if (!variantDetailsHtml || !assertionListTable) {
      return { error: "Data not found", details: "Required data not found in the HTML", searchTerm };
    }
    console.log('Data extracted successfully');
    // Process the data using the utility functions
    const variantDetails = parseVariantDetails(variantDetailsHtml);
    const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);
    // Prepare the processed data to send to the frontend
    return {
      searchTerm,
      variantDetails,
      assertionList
    };
  } catch (error) {
    console.error('Error in processClinVarQuery:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code that falls out of the range of 2xx
      if (error.response.status === 404) {
        return { error: "Not found", details: "The requested variation was not found.", searchTerm };
      } else if (error.response.status === 502) {
        return { error: "Server unavailable", details: "ClinVar server is currently unavailable. Please try again later.", searchTerm };
      }
    } else if (error.request) {
      // The request was made but no response was received
      return { error: "No response", details: "No response received from ClinVar server.", searchTerm };
    }
    // Something happened in setting up the request that triggered an Error
    return { error: "Unexpected error", details: error.message, searchTerm };
  }
}

/**
 * Helper function to process general ClinVar queries
 * Searches ClinVar and aggregates results from search page
 * 
 * @param {string} searchQuery - Encoded search query string
 * @param {Object} searchGroup - Original search group for reference
 * @param {string[]} clinicalSignificance - Clinical significance filters
 * @param {string} startDate - Start date filter
 * @param {string} endDate - End date filter
 * @returns {Object} Processed search results
 */
async function processGeneralClinVarQuery(searchQuery, searchGroup, clinicalSignificance, startDate, endDate) {
  const url = `https://www.ncbi.nlm.nih.gov/clinvar?term=${searchQuery}`;
  console.log('Using search URL:', url);

  try {
    const response = await axios.get(url, { timeout: 10000 });
    let $ = cheerio.load(response.data);

    // Check for "No items found" in title
    if ($('title').text().includes('No items found')) {
      console.log("No results found for this query.");
      return {
        error: "No items found",
        details: "No variants match the search criteria.",
        searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
      };
    }

    // Get all relevant entries from the search page
    const entries = $('.blocklevelaintable');
    const aggregatedResults = [];

    // Process each entry that matches our search criteria
    for (let i = 0; i < entries.length; i++) {
      const entryText = $(entries[i]).text().trim();
      const entryUrl = $(entries[i]).attr('href');
      
      // Verify this entry matches our search terms
      const matchesSearch = Object.values(searchGroup)
        .filter(Boolean)
        .every(term => entryText.toLowerCase().includes(term.toLowerCase()));

      if (matchesSearch) {
        try {
          // Process the individual variant page
          const variantUrl = `https://www.ncbi.nlm.nih.gov${entryUrl}`;
          console.log('Processing variant URL:', variantUrl);
          
          const variantResponse = await axios.get(variantUrl, { timeout: 10000 });
          const variantPage = cheerio.load(variantResponse.data);
          
          const variantDetailsHtml = variantPage('#id_first').html();
          const assertionListTable = variantPage('#assertion-list').prop('outerHTML');
          
          if (!variantDetailsHtml || !assertionListTable) {
            console.log('Missing required data for:', variantUrl);
            continue;
          }

          // Process variant details and assertions
          const variantDetails = parseVariantDetails(variantDetailsHtml);
          const assertionList = refinedClinvarHtmlTableToJson(assertionListTable);
          
          // Structure the result to match the expected format
          aggregatedResults.push({
            searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`,
            variantDetails,
            assertionList,
            searchGroup // Keep the original search group for reference
          });
        } catch (error) {
          console.error('Error processing variant page:', error);
          continue;
        }
      }
    }

    if (aggregatedResults.length === 0) {
      return {
        error: "No matching variants",
        details: "No variants found matching all search terms.",
        searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
      };
    }

    // Return the results in a format that matches the frontend's expectations
    return aggregatedResults;

  } catch (error) {
    console.error('Error in processGeneralClinVarQuery:', error.message);
    if (error.response) {
      if (error.response.status === 404) {
        return { 
          error: "Not found", 
          details: "The requested search returned no results.",
          searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
        };
      } else if (error.response.status === 502) {
        return { 
          error: "Server unavailable", 
          details: "ClinVar server is currently unavailable. Please try again later.",
          searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
        };
      }
    } else if (error.request) {
      return { 
        error: "No response", 
        details: "No response received from ClinVar server.",
        searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
      };
    }
    return { 
      error: "Unexpected error", 
      details: error.message,
      searchTerm: `${Object.values(searchGroup).filter(Boolean).join(' AND ')}`
    };
  }
}

/**
 * Utility functions for processing database query results
 * Transforms database results to match web API format
 */

function processDbResults(results, searchTerm) {
  console.log('Processing database results for:', searchTerm);
  
  if (!results || results.length === 0) {
    return [{
      error: "No results found",
      details: "No matching data in database",
      searchTerm
    }];
  }

  // Group results by VariationID
  const groupedResults = results.reduce((acc, result) => {
    const variationId = result.VariationID;
    if (!acc[variationId]) {
      acc[variationId] = [];
    }
    acc[variationId].push(result);
    return acc;
  }, {});

  // Transform groups into standard format
  return Object.entries(groupedResults).map(([variationId, submissions]) => {
    const mainResult = submissions[0];
    
    // Parse name components
    let fullName = mainResult.Name || '';
    let geneSymbol = '';
    let transcriptId = '';
    let dnaChange = '';
    let proteinChange = '';

    // Extract components if name follows expected format
    if (fullName.includes(':') && fullName.includes('(') && fullName.includes(')')) {
      try {
        const geneParts = fullName.split('(');
        if (geneParts.length > 1) {
          geneSymbol = geneParts[1].split(')')[0].trim();
          
          if (geneSymbol.length < 10) {
            transcriptId = geneParts[0].trim();
            const changeParts = fullName.split(':');
            if (changeParts.length > 1) {
              dnaChange = changeParts[1].split(' ')[0].trim();
              const proteinParts = fullName.match(/\((.*?)\)/g);
              if (proteinParts && proteinParts.length > 1) {
                proteinChange = proteinParts[1].replace(/[()]/g, '').trim();
              }
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing name components:', error);
      }
    }

    return {
      searchTerm,
      variantDetails: {
        fullName: mainResult.Name || '',
        geneSymbol: mainResult.GeneSymbol || '',
        transcriptID: transcriptId,
        dnaChange,
        proteinChange,
        variationID: mainResult.VariationID?.toString() || '',
        accessionID: ''
      },
      assertionList: submissions.map(submission => {
        // Extract condition name after the colon
        const conditionName = submission.ConditionInfo?.split(':')[1]?.trim() || '';
    
        return {
          Classification: {
            value: submission.ClinicalSignificance || '',
            date: submission.DateLastEvaluated || ''
          },
          'Review status': {
            stars: '',  // This appears to be blank in the UI
            'assertion criteria': submission.ReviewStatus || '',
            'assertion reference': '',  // This appears to be blank in the UI
            method: submission.Method || ''
          },
          Condition: {
            name: conditionName,
            'Affected status': submission.AffectedStatus || '',  
            'Allele origin': submission.AlleleOrigin || ''
          },
          Submitter: {
            name: submission.Submitter || '',
            Accession: submission.SubmitterAccession || '',
            'First in ClinVar': '',  // Not in raw data
            'Last updated': submission.DateLastEvaluated || ''
          },
          'More information': {
            Publications: {},
            'Other databases': {},
            Comment: submission.Description || ''
          }
        };
      })
    };
  });
}

/**
 * Helper function for the download route
 * transforms the information into a file
 * @param {object} results 
 * @param {string} format 
 * @returns {object} fileObject
 */
function generateDownloadContent(results, format) {
  const fields = [
    "Transcript ID",
    "Gene Symbol",
    "DNA Change",
    "Protein Change",
    "Gene Name",
    "Variation ID",
    "Accession ID",
    "Classification",
    "Last Evaluated",
    "Assertion Criteria",
    "Method",
    "Condition",
    "Affected Status",
    "Allele Origin",
    "Submitter",
    "Submitter Accession",
    "First in ClinVar",
    "Last Updated",
    "Comment"
  ];

  const data = results.flatMap(result => 
    result.assertionList.map(row => ({
      "Transcript ID": result.variantDetails.transcriptID,
      "Gene Symbol": result.variantDetails.geneSymbol,
      "DNA Change": result.variantDetails.dnaChange,
      "Protein Change": result.variantDetails.proteinChange,
      "Gene Name": result.variantDetails.fullName,
      "Variation ID": result.variantDetails.variationID,
      "Accession ID": result.variantDetails.accessionID,
      "Classification": `${row.Classification.value || 'N/A'} (${row.Classification.date || 'N/A'})`,
      "Last Evaluated": row.Classification.date,
      "Assertion Criteria": row['Review status']['assertion criteria'],
      "Method": row['Review status'].method,
      "Condition": row.Condition.name,
      "Affected Status": row.Condition['Affected status'],
      "Allele Origin": row.Condition['Allele origin'],
      "Submitter": row.Submitter.name,
      "Submitter Accession": row.Submitter.Accession,
      "First in ClinVar": row.Submitter['First in ClinVar'],
      "Last Updated": row.Submitter['Last updated'],
      "Comment": row['More information'].Comment
    }))
  );

  if (format === 'csv') {
    const json2csvParser = new Parser({ fields });
    return json2csvParser.parse(data);
  } else if (format === 'tsv') {
    const json2csvParser = new Parser({ fields, delimiter: '\t' });
    return json2csvParser.parse(data);
  } else if (format === 'xml') {
    const builder = new xml2js.Builder({
      rootName: 'ClinVarResults',
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
    const xmlObj = {
      Result: data.map(item => ({
        VariantDetails: {
          TranscriptID: item['Transcript ID'],
          GeneSymbol: item['Gene Symbol'],
          DNAChange: item['DNA Change'],
          ProteinChange: item['Protein Change'],
          GeneName: item['Gene Name'],
          VariationID: item['Variation ID'],
          AccessionID: item['Accession ID']
        },
        Classification: {
          Value: item['Classification'].split(' (')[0],
          Date: item['Last Evaluated']
        },
        ReviewStatus: {
          AssertionCriteria: item['Assertion Criteria'],
          Method: item['Method']
        },
        Condition: {
          Name: item['Condition'],
          AffectedStatus: item['Affected Status'],
          AlleleOrigin: item['Allele Origin']
        },
        Submitter: {
          Name: item['Submitter'],
          Accession: item['Submitter Accession'],
          FirstInClinVar: item['First in ClinVar'],
          LastUpdated: item['Last Updated']
        },
        Comment: item['Comment']
      }))
    };
    return builder.buildObject(xmlObj);
  }

  throw new Error('Unsupported format');
}

// Add this route to your server.js
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;
  console.log('Processing password reset request for email:', email);

  try {
    // Check if email exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        exists: false,
        message: 'No account found with this email.' 
      });
    }

    // Generate a random 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code with expiration (15 minutes)
    await pool.execute(
      'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [email, resetCode]
    );

    // Reset the API key before sending
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Log API key presence (don't log the actual key!)
    console.log('API Key present:', !!process.env.SENDGRID_API_KEY);
    console.log('Sender email:', process.env.SENDGRID_FROM_EMAIL);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Password Reset Code - HelixHunt',
      text: `Your password reset code is: ${resetCode}\nThis code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Code</h2>
          <p>Your password reset code is: <strong style="font-size: 1.2em; color: #4F46E5;">${resetCode}</strong></p>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #666;">If you did not request this code, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 0.8em; color: #666;">This is an automated message from HelixHunt. Please do not reply to this email.</p>
        </div>
      `
    };

    // For debugging, log the message structure (without the actual code)
    console.log('Sending email to:', email);
    console.log('From:', process.env.SENDGRID_FROM_EMAIL);

    return sgMail
      .send(msg)
      .then(() => {
        console.log('Reset code email sent successfully to:', email);
        res.json({ 
          exists: true,
          message: 'Reset code sent successfully' 
        });
      })
      .catch((error) => {
        // Log more detailed error information
        console.error('SendGrid error details:', {
          message: error.message,
          response: error.response?.body,
          code: error.code
        });
        
        res.status(500).json({ 
          exists: false,
          error: 'Failed to send reset code email',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      });

  } catch (error) {
    console.error('Error in check-email route:', error);
    res.status(500).json({ 
      exists: false,
      error: 'An error occurred while processing your request' 
    });
  }
});

// Add verification endpoint
app.post('/api/verify-reset-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    // Check if code exists and is valid
    const [codes] = await pool.execute(
      'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0 ORDER BY created_at DESC LIMIT 1',
      [email, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset code' 
      });
    }

    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({ 
      error: 'An error occurred while verifying the code' 
    });
  }
});

// Update reset-password endpoint
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Verify code is valid and unused
      const [codes] = await connection.execute(
        'SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0 ORDER BY created_at DESC LIMIT 1',
        [email, code]
      );

      if (codes.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid or expired reset code' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await connection.execute(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
      );

      // Mark reset code as used
      await connection.execute(
        'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
        [codes[0].id]
      );

      await connection.commit();
      res.json({ message: 'Password has been reset successfully' });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An error occurred while processing your request' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});