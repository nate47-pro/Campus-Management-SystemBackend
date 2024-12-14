const router = require('express').Router();
const { auth } = require('../middleware/auth');
const pool = require('../config/db');
const { check, validationResult } = require('express-validator');

// Submit feedback for an event
router.post('/:eventId', [
  check('rating').isInt({ min: 1, max: 5 }),
  check('comment').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if user attended the event
    const attendance = await pool.query(
      `SELECT * FROM registrations 
       WHERE event_id = $1 AND user_id = $2 
       AND status = 'confirmed'`,
      [eventId, userId]
    );

    if (attendance.rows.length === 0) {
      return res.status(403).json({ 
        message: 'Only confirmed attendees can submit feedback' 
      });
    }

    // Check if event has already ended
    const event = await pool.query(
      'SELECT * FROM events WHERE id = $1 AND event_date < NOW()',
      [eventId]
    );

    if (event.rows.length === 0) {
      return res.status(400).json({ 
        message: 'Feedback can only be submitted after the event has ended' 
      });
    }

    // Check for existing feedback
    const existingFeedback = await pool.query(
      'SELECT * FROM feedback WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (existingFeedback.rows.length > 0) {
      return res.status(400).json({ 
        message: 'You have already submitted feedback for this event' 
      });
    }

    // Submit feedback
    const feedback = await pool.query(
      'INSERT INTO feedback (event_id, user_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *',
      [eventId, userId, rating, comment]
    );

    // Update event average rating
    await updateEventRating(eventId);

    res.json(feedback.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const feedback = await pool.query(`
      SELECT f.*, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.event_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3
    `, [eventId, limit, offset]);

    const total = await pool.query(
      'SELECT COUNT(*) FROM feedback WHERE event_id = $1',
      [eventId]
    );

    res.json({
      feedback: feedback.rows,
      total: parseInt(total.rows[0].count),
      pages: Math.ceil(total.rows[0].count / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update feedback (only within 24 hours of submission)
router.put('/:feedbackId', [
  check('rating').isInt({ min: 1, max: 5 }),
  check('comment').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { feedbackId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if feedback exists and belongs to user
    const existingFeedback = await pool.query(
      `SELECT * FROM feedback 
       WHERE id = $1 AND user_id = $2`,
      [feedbackId, userId]
    );

    if (existingFeedback.rows.length === 0) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Check if within 24 hours
    const feedbackDate = new Date(existingFeedback.rows[0].created_at);
    const hoursSinceSubmission = (Date.now() - feedbackDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSubmission > 24) {
      return res.status(400).json({ 
        message: 'Feedback can only be updated within 24 hours of submission' 
      });
    }

    // Update feedback
    const updatedFeedback = await pool.query(
      `UPDATE feedback 
       SET rating = $1, comment = $2 
       WHERE id = $3 
       RETURNING *`,
      [rating, comment, feedbackId]
    );

    // Update event average rating
    await updateEventRating(existingFeedback.rows[0].event_id);

    res.json(updatedFeedback.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback statistics for an event
router.get('/stats/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_feedback,
        ROUND(AVG(rating), 2) as average_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating = 3) as three_star,
        COUNT(*) FILTER (WHERE rating = 2) as two_star,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
      FROM feedback
      WHERE event_id = $1
    `, [eventId]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update event average rating
async function updateEventRating(eventId) {
  try {
    await pool.query(`
      UPDATE events 
      SET average_rating = (
        SELECT ROUND(AVG(rating), 2)
        FROM feedback
        WHERE event_id = $1
      )
      WHERE id = $1
    `, [eventId]);
  } catch (error) {
    console.error('Error updating event rating:', error);
    throw error;
  }
}

module.exports = router; 