const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const compression = require('compression');
const { pool, initializePool, createOptimizedIndexes } = require('./config/database');
const { initializeScheduler } = require('./services/fileService/scheduler');
const authRoutes = require('./routes/auth.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const queryRoutes = require('./routes/query.routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');
const { cleanupTemporaryData } = require('./services/cleanup.service');

dotenv.config();

const app = express();

// Increase payload limits with validation
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch(e) {
      res.status(400).json({ error: 'Invalid JSON payload' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

// Enable CORS with specific options
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://helix-hunt.onrender.com' 
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const port = process.env.PORT || 5001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Enable compression for all routes
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balanced compression level
}));


app.use(limiter);

// Request timeout middleware
app.use((req, res, next) => {
  // Extended timeout for data-heavy routes
  if (req.path.includes('/api/download') || req.path.includes('/api/clinvar')) {
    req.setTimeout(300000); // 5 minutes
  } else {
    req.setTimeout(30000); // 30 seconds default
  }
  next();
});

// Request logging middleware with size tracking
app.use((req, res, next) => {
  const start = process.hrtime();
  const contentLength = req.headers['content-length'] 
    ? `(${(parseInt(req.headers['content-length']) / 1024).toFixed(2)} KB)` 
    : '';
  
  console.log(`Received ${req.method} request for ${req.url} ${contentLength}`);

  // Log response time and size
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const time = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);
    const size = res.getHeader('content-length')
      ? `(${(parseInt(res.getHeader('content-length')) / 1024).toFixed(2)} KB)`
      : '';
    
    console.log(`Completed ${req.method} ${req.url} ${res.statusCode} in ${time}ms ${size}`);
  });

  next();
});

// Initialize database and create tables
async function initializeDatabase(pool) {
  try {
    const connection = await pool.getConnection();
    try {
      // Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create query_chunks table with corrected syntax
      await connection.query(`
        CREATE TABLE IF NOT EXISTS query_chunks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          query_id VARCHAR(255) NOT NULL,
          chunk_number INT NOT NULL,
          data LONGTEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 1 DAY),
          INDEX idx_query_chunks (query_id, chunk_number)
        ) ENGINE=InnoDB
      `);

      // Create processing_status table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS processing_status (
          id VARCHAR(255) PRIMARY KEY,
          status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL,
          progress INT DEFAULT 0,
          total_items INT DEFAULT 0,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
      `);
      
      // Create optimized indexes
      await createOptimizedIndexes(connection);
      
      console.log('Database tables and indexes created successfully');
      return pool;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Initialize application
async function initializeApp() {
  try {
    // Initialize the database pool first
    const dbPool = await initializePool();
    
    // Initialize database tables
    await initializeDatabase(dbPool);
    
    // Initialize scheduler
    await initializeScheduler(dbPool);


    
    // Routes
    app.use('/api', authRoutes);
    app.use('/api', preferencesRoutes);
    app.use('/api', queryRoutes);

    // Serve static files from the React app
    app.use(express.static(path.join(__dirname, '../build')));

    // Route all other requests to the React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../build', 'index.html'));
    });


    // Error handling for payload size
    app.use((error, req, res, next) => {
      if (error instanceof SyntaxError || error.type === 'entity.too.large') {
        return res.status(413).json({
          error: 'Payload too large',
          details: 'The request data exceeds the maximum allowed size.'
        });
      }
      next(error);
    });

    // General error handling middleware
    app.use(errorHandler);

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    // Cleanup expired chunks periodically
    setInterval(async () => {
      try {
        await dbPool.query('DELETE FROM query_chunks WHERE expires_at < NOW()');
      } catch (error) {
        console.error('Error cleaning up expired chunks:', error);
      }
    }, 3600000); // Run every hour

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  
  // Close database pool
  try {
    await pool.end();
    console.log('Database pool closed.');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
  
  process.exit(0);
});

module.exports = app;