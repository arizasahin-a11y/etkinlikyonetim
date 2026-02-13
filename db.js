const { Pool } = require('pg');

// Use environment variable for connection string or default to local/Render config
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/student_tracker';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false, // Render requires SSL
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
