const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, initializePool, createOptimizedIndexes } = require('./config/database');
const { initializeScheduler } = require('./services/fileService/scheduler');
const authRoutes = require('./routes/auth.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const queryRoutes = require('./routes/query.routes');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Initialize database and create tables
async function initializeDatabase(pool) {
  try {
    const connection = await pool.getConnection();

    try {
      // Create tables if they don't exist
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ... (rest of the table creation queries)
      
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

    // Error handling middleware
    app.use(errorHandler);

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
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