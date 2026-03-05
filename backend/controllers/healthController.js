const pool = require('../db');

async function healthCheck(req, res) {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
}

module.exports = {
  healthCheck,
};
