const errorHandler = (err, req, res, next) => {
	// Log error with memory usage
	console.error('Error:', {
	  message: err.message,
	  stack: err.stack,
	  memoryUsage: {
		heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
		heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
	  },
	  timestamp: new Date().toISOString()
	});
  
	// Use provided status code or default to 500
	const statusCode = err.statusCode || 500;
	const message = err.message || 'Internal Server Error';
	
	// Send error response
	res.status(statusCode).json({
	  error: {
		message,
		...(process.env.NODE_ENV === 'development' && { 
		  stack: err.stack,
		  memoryUsage: process.memoryUsage()
		})
	  }
	});
  };
  
  module.exports = errorHandler;