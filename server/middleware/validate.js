const { validationResult } = require('express-validator');
const { Pool } = require('pg');
const format = require('pg-format');

/**
 * Custom validator for PostgreSQL JSON/JSONB fields
 */
const isValidJson = value => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    throw new Error('Invalid JSON format');
  }
};

/**
 * Custom validator for PostgreSQL arrays
 */
const isValidArray = value => {
  if (!Array.isArray(value)) {
    throw new Error('Value must be an array');
  }
  return true;
};

/**
 * Sanitizes values for PostgreSQL queries
 */
const sanitizeValue = value => {
  if (typeof value === 'string') {
    // Escape special characters
    return value.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, char => {
      switch (char) {
        case '\0':
          return '\\0';
        case '\x08':
          return '\\b';
        case '\x09':
          return '\\t';
        case '\x1a':
          return '\\z';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char; // prepends a backslash to backslash, percent, and double/single quotes
      }
    });
  }
  return value;
};

/**
 * Middleware for request data validation
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(error => ({
        ...error,
        value: undefined // Don't send back invalid values
      }))
    });
  }

  // Sanitize request body for PostgreSQL
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeValue(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(sanitizeValue);
      }
    });
  }

  next();
};

/**
 * Create validation chain for PostgreSQL JSON fields
 */
const validateJson = (value, { req }) => {
  if (!value) return true;
  try {
    if (typeof value === 'string') {
      JSON.parse(value);
    } else {
      JSON.stringify(value);
    }
    return true;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};

/**
 * Validation for PostgreSQL date fields
 */
const validateDate = (value, { req }) => {
  if (!value) return true;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return true;
};

module.exports = {
  validate,
  validateJson,
  validateDate,
  isValidJson,
  isValidArray,
  sanitizeValue
};