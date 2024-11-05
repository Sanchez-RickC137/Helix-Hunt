const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializePool } = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const queryRoutes = require('./routes/query.routes');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Received ${req.method} request for ${req.url}`);
  next();
});

// Initialize database pool
initializePool().catch(console.error);

// Routes
app.use('/api', authRoutes);
app.use('/api', preferencesRoutes);
app.use('/api', queryRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An error occurred while processing your request' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});