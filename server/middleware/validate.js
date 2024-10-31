/**
 * Validation middleware for request data
 * Uses express-validator to validate request data
 */

const { validationResult } = require('express-validator');

/**
 * Middleware function to validate request data
 * Checks for validation errors from express-validator
 * Sends 400 response if validation fails
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @throws {400} If validation errors are found
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = validate;