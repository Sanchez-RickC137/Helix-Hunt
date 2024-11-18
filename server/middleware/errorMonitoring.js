const errorMonitoring = (req, res, next) => {
	// Track memory usage
	const memoryUsage = process.memoryUsage();
	const memoryThreshold = 1024 * 1024 * 1024; // 1GB
  
	if (memoryUsage.heapUsed > memoryThreshold) {
	  console.warn('High memory usage detected:', {
		heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
		heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
		timestamp: new Date().toISOString()
	  });
	}
  
	// Track response time
	const start = process.hrtime();
  
	res.on('finish', () => {
	  const duration = process.hrtime(start);
	  const responseTime = (duration[0] * 1e3 + duration[1] * 1e-6).toFixed(2);
  
	  if (responseTime > 5000) { // Log slow responses (>5s)
		console.warn('Slow response detected:', {
		  method: req.method,
		  url: req.url,
		  duration: `${responseTime}ms`,
		  timestamp: new Date().toISOString()
		});
	  }
	});
  
	next();
  };
  
  module.exports = errorMonitoring;