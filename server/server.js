const axios = require('axios');
const bcrypt = require('bcrypt');
const cheerio = require('cheerio');
const cors = require('cors');
// const crypto = require('crypto');
const dotenv = require('dotenv');
const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { Parser } = require('json2csv');
const xml2js = require('xml2js');
const { parseVariantDetails, refinedClinvarHtmlTableToJson } = require('./utils/clinvarUtils');
const { body, validationResult } = require('express-validator');

const auth = require('./middleware/auth');
const validate = require('./middleware/validate');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');
  connection.release();
});

// User registration route
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

// User login route
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

// Password change route
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

app.post('/api/forgot-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Check if the email exists
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    // If email exists and new password is provided, reset the password
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
      return res.json({ message: 'Password has been reset successfully.' });
    }

    // If only email is provided, confirm that the account exists
    return res.json({ message: 'Email verified. You can now reset your password.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'An error occurred. Please try again later.' });
  }
});

// Reset password route
app.post('/api/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password.' });
  }
});

// Get user preferences
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

// Update user preferences
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

// Save new query to history
app.post('/api/save-query', auth, async (req, res, next) => {
  try {
    console.log('Saving query for user:', req.userId);
    const { fullNames, variationIDs, clinicalSignificance, startDate, endDate } = req.body;
    
    // Convert empty string dates to null
    const formattedStartDate = startDate || null;
    const formattedEndDate = endDate || null;

    await pool.execute(
      'INSERT INTO query_history (user_id, full_names, variation_ids, clinical_significance, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, JSON.stringify(fullNames), JSON.stringify(variationIDs), JSON.stringify(clinicalSignificance), formattedStartDate, formattedEndDate]
    );
    console.log('Query saved successfully');
    res.json({ message: 'Query saved to history successfully' });
  } catch (error) {
    console.error('Error saving query to history:', error);
    res.status(500).json({ error: 'An error occurred while saving the query', details: error.message });
  }
});

// Get query history
app.get('/api/query-history', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM query_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5', [req.userId]);
    
    const processedRows = rows.map(row => ({
      id: row.id,
      fullNames: row.full_names || [],
      variationIDs: row.variation_ids || [],
      clinicalSignificance: row.clinical_significance || [],
      startDate: row.start_date,
      endDate: row.end_date,
      timestamp: row.timestamp
    }));

    res.json(processedRows);
  } catch (error) {
    console.error('Error fetching query history:', error);
    res.status(500).json({ error: 'An error occurred while fetching query history' });
  }
});

// ClinVar query route
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
    res.json(results);
  } catch (error) {
    console.error('Error processing ClinVar queries:', error);
    res.status(500).json({ error: 'An error occurred while processing queries', details: error.message });
  }
});

// Download route
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An error occurred while processing your request' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});