const pool = require('../config/db');
const { sendRegistrationEmail } = require('./emailService');

async function promoteFromWaitlist(eventId) {
  try {
    // Get the next person in waitlist
    const nextInLine = await pool.query(`
      SELECT * FROM registrations 
      WHERE event_id = $1 AND status = 'waitlist' 
      ORDER BY registration_date 
      LIMIT 1
    `, [eventId]);

    if (nextInLine.rows.length > 0) {
      // Update their status to confirmed
      await pool.query(
        'UPDATE registrations SET status = $1 WHERE id = $2',
        ['confirmed', nextInLine.rows[0].id]
      );

      // Send confirmation email
      await sendRegistrationEmail(
        nextInLine.rows[0].user_id,
        eventId,
        'confirmed'
      );
    }
  } catch (error) {
    console.error('Error promoting from waitlist:', error);
  }
}

module.exports = { promoteFromWaitlist }; 