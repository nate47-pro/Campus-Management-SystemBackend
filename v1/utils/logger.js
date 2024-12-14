const pool = require('../config/db');

async function logSystemEvent(type, description, userId = null, ipAddress = null) {
  try {
    await pool.query(
      'INSERT INTO system_logs (log_type, description, user_id, ip_address) VALUES ($1, $2, $3, $4)',
      [type, description, userId, ipAddress]
    );
  } catch (error) {
    console.error('Error logging system event:', error);
  }
}

module.exports = { logSystemEvent }; 