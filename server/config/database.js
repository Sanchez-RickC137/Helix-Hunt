const mysql = require('mysql2/promise');
const { createReadStream } = require('fs');
const dotenv = require('dotenv');

dotenv.config();

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

// Test and configure pool
const initializePool = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SET GLOBAL local_infile = 1');
    console.log('LOCAL INFILE enabled');
    connection.release();
    
    console.log('Successfully connected to the database.');
  } catch (error) {
    console.error('Error configuring pool:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initializePool
};