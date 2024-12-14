const pool = require('../config/db');

async function checkVenueConflicts(venueId, startTime, duration) {
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  const conflicts = await pool.query(`
    SELECT COUNT(*) 
    FROM events 
    WHERE venue_id = $1 
    AND (
      (event_date BETWEEN $2 AND $3)
      OR 
      (event_date + (duration || ' minutes')::interval BETWEEN $2 AND $3)
      OR 
      ($2 BETWEEN event_date AND event_date + (duration || ' minutes')::interval)
    )
  `, [venueId, startTime, endTime]);

  return parseInt(conflicts.rows[0].count) > 0;
}

async function getVenueSchedule(venueId, date) {
  const schedule = await pool.query(`
    SELECT 
      e.id,
      e.title,
      e.event_date,
      e.duration,
      e.event_date + (e.duration || ' minutes')::interval as end_time
    FROM events e
    WHERE e.venue_id = $1 
    AND DATE(e.event_date) = $2
    ORDER BY e.event_date
  `, [venueId, date]);

  return schedule.rows;
}

async function getVenueCapacity(venueId) {
  const result = await pool.query(
    'SELECT capacity FROM venues WHERE id = $1',
    [venueId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Venue not found');
  }
  
  return result.rows[0].capacity;
}

module.exports = {
  checkVenueConflicts,
  getVenueSchedule,
  getVenueCapacity
}; 