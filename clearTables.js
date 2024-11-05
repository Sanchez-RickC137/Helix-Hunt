const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearTables() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    const connection = await pool.getConnection();
    try {
      // Drop all tables
      await connection.query('DROP TABLE IF EXISTS variant_summary');
      await connection.query('DROP TABLE IF EXISTS submission_summary');
      await connection.query('DROP TABLE IF EXISTS summary_of_conflicting_interpretations');
      await connection.query('DROP TABLE IF EXISTS hgvs4variation');
      
      console.log('All tables dropped successfully');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error clearing tables:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  clearTables();
}
