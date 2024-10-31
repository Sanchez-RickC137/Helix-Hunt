/**
 * Global error handling middleware
 * Provides consistent error response format across the application
 */

/**
 * Error handling middleware function
 * Logs errors and sends formatted error responses
 * Includes stack trace in development environment
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const errorHandler = (err, req, res, next) => {
	// Log error stack trace
	console.error(err.stack);
	
	// Use provided status code or default to 500
	const statusCode = err.statusCode || 500;
	const message = err.message || 'Internal Server Error';
	
	// Send error response
	res.status(statusCode).json({
	  error: {
		message,
		// Include stack trace only in development
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	  }
	});
  };
  
  module.exports = errorHandler;