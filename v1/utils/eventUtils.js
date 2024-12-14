const pool = require('../config/db');

const getEventCapacity = async (eventId) => {
  const result = await pool.query(`
    SELECT e.max_participants, COUNT(r.id) as current_registrations
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
    WHERE e.id = $1
    GROUP BY e.id, e.max_participants
  `, [eventId]);
  
  if (result.rows.length === 0) {
    throw new Error('Event not found');
  }
  
  return {
    maxCapacity: result.rows[0].max_participants,
    currentRegistrations: parseInt(result.rows[0].current_registrations),
    available: result.rows[0].max_participants - parseInt(result.rows[0].current_registrations)
  };
};

const isEventFull = async (eventId) => {
  const capacity = await getEventCapacity(eventId);
  return capacity.available <= 0;
};

module.exports = {
  getEventCapacity,
  isEventFull
}; 