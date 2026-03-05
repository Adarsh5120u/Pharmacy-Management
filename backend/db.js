const { Pool } = require('pg');
require('dotenv').config();

// Log the connection attempt for debugging
console.log('Attempting to connect to PostgreSQL...');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('Port:', process.env.DB_PORT || 5432);
console.log('Database:', process.env.DB_NAME || 'pharmacy_db');
console.log('User:', process.env.DB_USER || 'postgres');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || 5432, 10),
  database: process.env.DB_NAME || 'pharmacy_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected at', res.rows[0].now);
  }
});

module.exports = pool;
