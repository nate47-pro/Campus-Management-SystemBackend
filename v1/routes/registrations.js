const router = require('express').Router();
const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const { getEventCapacity, isEventFull } = require('../utils/eventUtils');
const { sendRegistrationEmail } = require('../utils/emailService');

// Register for an event
router.post('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if already registered
    const existingReg = await pool.query(
      'SELECT * FROM registrations WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (existingReg.rows.length > 0) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }

    // Check event capacity
    const isFull = await isEventFull(eventId);
    const status = isFull ? 'waitlist' : 'confirmed';

    // Create registration
    const registration = await pool.query(
      'INSERT INTO registrations (event_id, user_id, status) VALUES ($1, $2, $3) RETURNING *',
      [eventId, userId, status]
    );

    // Send confirmation email
    await sendRegistrationEmail(userId, eventId, status);

    res.json({
      registration: registration.rows[0],
      message: status === 'waitlist' 
        ? 'Added to waitlist due to full capacity' 
        : 'Registration successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's registrations
router.get('/my-registrations',  async (req, res) => {
  try {
    const registrations = await pool.query(`
      SELECT r.*, e.title, e.event_date, e.category, v.name as venue_name
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      JOIN venues v ON e.venue_id = v.id
      WHERE r.user_id = $1
      ORDER BY e.event_date
    `, [req.user.id]);

    res.json(registrations.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel registration
router.delete('/:eventId',  async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Delete registration
    const deletedReg = await pool.query(
      'DELETE FROM registrations WHERE event_id = $1 AND user_id = $2 RETURNING *',
      [eventId, userId]
    );

    if (deletedReg.rows.length === 0) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // If a confirmed registration was cancelled, promote someone from waitlist
    if (deletedReg.rows[0].status === 'confirmed') {
      await promoteFromWaitlist(eventId);
    }

    res.json({ message: 'Registration cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get event registrations (for organizers and admins)
router.get('/event/:eventId',  async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user is authorized
    const event = await pool.query(
      'SELECT organizer_id FROM events WHERE id = $1',
      [eventId]
    );

    if (event.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.rows[0].organizer_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registrations = await pool.query(`
      SELECT r.*, u.email
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = $1
      ORDER BY r.registration_date
    `, [eventId]);

    res.json(registrations.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 