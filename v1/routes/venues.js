const router = require('express').Router();
const { auth, authorize } = require('../middleware/auth');
const pool = require('../config/db');
const { check, validationResult } = require('express-validator');

// Create venue (Admin only)
router.post('/', [
  check('name').notEmpty(),
  check('capacity').isInt({ min: 1 }),
  check('location').notEmpty(),
  check('facilities').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, capacity, location, facilities } = req.body;

    const newVenue = await pool.query(
      'INSERT INTO venues (name, capacity, location, facilities) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, capacity, location, facilities]
    );

    res.json(newVenue.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all venues with availability
router.get('/', async (req, res) => {
  try {
    const { date, time } = req.query;
    
    let query = `
      SELECT v.*,
      (SELECT COUNT(*) FROM events e 
       WHERE e.venue_id = v.id 
       AND e.event_date::date = COALESCE($1::date, CURRENT_DATE)
      ) as events_count
      FROM venues v
    `;
    
    const queryParams = [date || null];
    
    const venues = await pool.query(query, queryParams);
    res.json(venues.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get venue availability for a specific date range
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const events = await pool.query(`
      SELECT e.event_date, e.duration, e.title
      FROM events e
      WHERE e.venue_id = $1
      AND e.event_date BETWEEN $2::timestamp AND $3::timestamp
      ORDER BY e.event_date
    `, [id, startDate, endDate]);

    res.json(events.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update venue (Admin only)
router.put('/:id', [
  check('name').optional().notEmpty(),
  check('capacity').optional().isInt({ min: 1 }),
  check('location').optional().notEmpty(),
  check('facilities').optional().isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, capacity, location, facilities } = req.body;

    const updatedVenue = await pool.query(`
      UPDATE venues 
      SET 
        name = COALESCE($1, name),
        capacity = COALESCE($2, capacity),
        location = COALESCE($3, location),
        facilities = COALESCE($4, facilities)
      WHERE id = $5 
      RETURNING *
    `, [name, capacity, location, facilities, id]);

    if (updatedVenue.rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    res.json(updatedVenue.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete venue (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if venue has any upcoming events
    const upcomingEvents = await pool.query(
      'SELECT COUNT(*) FROM events WHERE venue_id = $1 AND event_date > NOW()',
      [id]
    );

    if (parseInt(upcomingEvents.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete venue with upcoming events' 
      });
    }

    const deletedVenue = await pool.query(
      'DELETE FROM venues WHERE id = $1 RETURNING *',
      [id]
    );

    if (deletedVenue.rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    res.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}); 

module.exports = router