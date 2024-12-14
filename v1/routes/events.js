const router = require('express').Router();
const pool = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

// Create event (Admin & Organizer only)
router.post('/', [
 
  check('title').notEmpty(),
  check('category').isIn(['academics', 'sports', 'workshops', 'cultural', 'other']),
  check('venue_id').isNumeric(),
  check('event_date').isISO8601(),
  check('duration').isNumeric(),
  check('max_participants').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check venue availability
    const venueAvailable = await checkVenueAvailability(
      req.body.venue_id,
      req.body.event_date,
      req.body.duration
    );

    if (!venueAvailable) {
      return res.status(400).json({ message: 'Venue not available for selected time' });
    }

    const {
      title,
      description,
      category,
      event_date,
      duration,
      max_participants
    } = req.body;

    const newEvent = await pool.query(
      `INSERT INTO events (
        title, description, category, organizer_id, venue_id, 
        event_date, duration, max_participants
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, category, req.user.id, venue_id, event_date, duration, max_participants]
    );

    res.json(newEvent.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all events with filters
router.get('/getEvents', async (req, res) => {
  // const { name, description, event_date, location, capacity, available_seats, type, created_by } = req.body;

  // if(!name || !description || !event_date || !location || !capacity || !available_seats || !type || !created_by) {
  //   console.log("All fields are required");
  //   return res.status(400).json({message: "All fields are required"});
  // }
  try {
    const events = await pool.query('SELECT * FROM events')
    res.json(events.rows)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update event (Admin & Original Organizer only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized to edit
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const {
      title,
      description,
      category,
      venue_id,
      event_date,
      duration,
      max_participants
    } = req.body;

    // Check venue availability if venue or time is changed
    if (venue_id !== event.rows[0].venue_id || event_date !== event.rows[0].event_date) {
      const venueAvailable = await checkVenueAvailability(venue_id, event_date, duration, id);
      if (!venueAvailable) {
        return res.status(400).json({ message: 'Venue not available for selected time' });
      }
    }

    const updatedEvent = await pool.query(
      `UPDATE events SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        venue_id = COALESCE($4, venue_id),
        event_date = COALESCE($5, event_date),
        duration = COALESCE($6, duration),
        max_participants = COALESCE($7, max_participants)
      WHERE id = $8 RETURNING *`,
      [title, description, category, venue_id, event_date, duration, max_participants, id]
    );

    // Notify registered users about the update
    await notifyEventUpdate(id);

    res.json(updatedEvent.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete event (Admin & Original Organizer only)
router.delete('/:id', auth, authorize(['admin', 'organizer']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is authorized to delete
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Notify registered users about cancellation
    await notifyEventCancellation(id);

    // Delete event and related registrations
    await pool.query('DELETE FROM registrations WHERE event_id = $1', [id]);
    await pool.query('DELETE FROM events WHERE id = $1', [id]);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to check venue availability
async function checkVenueAvailability(venueId, eventDate, duration, excludeEventId = null) {
  const query = `
    SELECT COUNT(*) 
    FROM events 
    WHERE venue_id = $1 
    AND id != COALESCE($4, 0)
    AND (
      (event_date BETWEEN $2 AND $2 + interval '1 minute' * $3)
      OR
      (event_date + interval '1 minute' * duration BETWEEN $2 AND $2 + interval '1 minute' * $3)
    )
  `;
  
  const result = await pool.query(query, [venueId, eventDate, duration, excludeEventId]);
  return parseInt(result.rows[0].count) === 0;
}

// Helper function to notify users about event updates
async function notifyEventUpdate(eventId) {
  // This will be implemented in the notification system phase
  // For now, it's a placeholder
}

// Helper function to notify users about event cancellation
async function notifyEventCancellation(eventId) {
  // This will be implemented in the notification system phase
  // For now, it's a placeholder
}

module.exports = router; 